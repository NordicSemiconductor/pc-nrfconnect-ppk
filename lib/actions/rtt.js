import EventEmitter from 'events';

// Local copy of serial port instance
import { RTT } from 'pc-nrfjprog-js';
import { PPK } from './PPKActions';

const STX = 0x02;
const ETX = 0x03;
const ESC = 0x1F;

const MODE_IDLE = 0;
const MODE_RECEIVE = 1;
const MODE_ESC_RECV = 2;

const ADC_REF = 0.6;
const ADC_GAIN = 4.0;
const ADC_MAX = 8192.0;

const MEAS_RANGE_NONE = 0;
const MEAS_RANGE_LO = 1;
const MEAS_RANGE_MID = 2;
const MEAS_RANGE_HI = 3;
const MEAS_RANGE_INVALID = 4;

const MEAS_RANGE_POS = 14;
/* eslint-disable no-bitwise */
const MEAS_RANGE_MSK = (3 << 14);

const MEAS_ADC_MSK = 0x3FFF;

const MEAS_RES_HI = 1.8;
const MEAS_RES_MID = 28;
const MEAS_RES_LO = 500;

export const PPKCmd = {
    TriggerSet: 0x01,           // following trigger of type int16          (working)
    AvgNumSet: 0x02,            // Number of samples x16 to average over    ()
    TriggerWindowSet: 0x03,     // following window of type unt16           (working)
    TriggerIntervalSet: 0x04,   //                                          (no-firmware)
    TriggerSingleSet: 0x05,     //                                          (semi-working)
    AverageStart: 0x06,         //                                          ()
    AverageStop: 0x07,          //                                          ()
    RangeSet: 0x08,             //                                          (no-firmware)
    LCDSet: 0x09,               //                                          (no-firmware)
    TriggerStop: 0x0A,          //                                          ()
    CalibrateOffset: 0x0B,      //                                          (no-firmware)
    DutToggle: 0x0C,            //                                          (working)
    RegulatorSet: 0x0D,         //                                          ()
    VrefLoSet: 0x0E,            //                                          ()
    VrefHiSet: 0x0F,            //                                          ()
    TriggerExtToggle: 0x11,     //                                          ()
    ResUserSet: 0x12,           //                                          ()
};

// Buffer for all received data
const serialBuf = [];
// Serial transmission state
let serialState = MODE_IDLE;
// Array to hold the valid bytes of the payload
let dataPayload = [];

export const events = new EventEmitter();

function getAdcResult(adcVal, range) {
    let res = 0;
    switch (range) {
        case MEAS_RANGE_LO:
            res = adcVal * (ADC_REF / (ADC_GAIN * ADC_MAX * MEAS_RES_LO));
            break;
        case MEAS_RANGE_MID:
            res = adcVal * (ADC_REF / (ADC_GAIN * ADC_MAX * MEAS_RES_MID));
            break;
        case MEAS_RANGE_HI:
            res = adcVal * (ADC_REF / (ADC_GAIN * ADC_MAX * MEAS_RES_HI));
            break;
        case MEAS_RANGE_INVALID:
            console.log('Invalid range');
            break;
        case MEAS_RANGE_NONE:
            console.log('Measurement range not detected');
            break;
        default:
            break;
    }
    return res;
}


// Allocate memory for the float value
const averageBuf = new ArrayBuffer(4);
// Typed array used for viewing the final 4-byte array as uint8_t values
const serialUint8View = new Uint8Array(averageBuf);
// View for the final float value that is pushed to the chart
const viewFloat = new Float32Array(averageBuf);

function handleAverageDataSet(data) {
    try {
        serialUint8View.set(data);
    } catch (e) {
        console.log('Failed setting uint8_t view');
        console.log(data);
    }
    try {
        const averageFloatValue = viewFloat[0];
        // Only fire the event, if the buffer data is valid
        events.emit('average', averageFloatValue);
    } catch (e) {
        console.log('Probably wrong length of the float value');
        console.log(e);
    }
}

function handleTriggerDataSet(data) {
    const buf = new ArrayBuffer(data.length);
    const viewUint8 = new Uint8Array(buf);
    const resultBuffer = [];
    let currentMeasurementRange = null;

    viewUint8.set(data);
    const view = new DataView(buf);
    console.log('Trigger length: ', data.length);
    for (let i = 0; i < data.length; i += 2) {
        const adcValue = view.getUint16(i, true);

        let sample = 0.0;
        // console.log('0xvalue: ', adcValue.toString(16));
        currentMeasurementRange = (adcValue & MEAS_RANGE_MSK) >> MEAS_RANGE_POS;

        const adcResult = (adcValue & MEAS_ADC_MSK);

        sample = getAdcResult(adcResult, currentMeasurementRange) * 1e6;
        // console.log('sample: ', String(sample));
        resultBuffer.push(sample);
    }
    console.log('Pushed trigger data of size: ', resultBuffer.length);
    events.emit('trigger', resultBuffer);
}

function convertSysTick(data) {
    const buf = new ArrayBuffer(data.length);
    const viewUint8 = new Uint8Array(buf);

    viewUint8.set(data);
    const view = new DataView(buf);
    const tickValue = view.getUint32(data, true);
    console.log(tickValue.toString(10));
}


function parseMeasurementData(data) {
    // Append all data on to serial_buf;
    serialBuf.push(...data);

    while (serialBuf.length > 0) {
        const byte = serialBuf.shift();

        if (serialState === MODE_IDLE) {
            if (byte === STX) {
                // Remove the first element of the array
                serialState = MODE_RECEIVE;
            }
        } else if (serialState === MODE_RECEIVE) {
            /*  ESC received means that a valid data byte was either
                STX, ETX or ESC. Two bytes are sent, ESC and then valid ^ 0x20
            */
            if (byte === ESC) {
                // Don't do anything here, but wait for next byte and XOR it
                serialState = MODE_ESC_RECV;
            // End of transmission, send to average or trigger handling
            } else if (byte === ETX) {
                if (dataPayload.length === 4) {
                    process.nextTick(handleAverageDataSet.bind(this, dataPayload.slice()));
                } else if (dataPayload.length === 5) {
                    process.nextTick(convertSysTick.bind(this, dataPayload.slice(0, 4)));
                } else if (dataPayload.length > 5) {
                    process.nextTick(handleTriggerDataSet.bind(this, dataPayload.slice()));
                }
                dataPayload = [];
                serialState = MODE_IDLE;
            } else if (byte === STX) {
                /*  Sometimes (~3%), for some reason, this happens. It shouldn't, but still.
                    Clearing the payload buffer will make the application survive and function,
                    but this should be investigated.
                */
                dataPayload = [];
            } else {
                // Input the value at the end of result array
                dataPayload.push(byte);
            }
        } else if (serialState === MODE_ESC_RECV) {
            // XOR the byte after the ESC-character
            // Remove these two bytes, the ESC and the valid one

            /* eslint-disable no-bitwise */
            const modbyte = (byte ^ 0x20);
            dataPayload.push(modbyte);
            serialState = MODE_RECEIVE;
        }
    }
}

export function PPKCommandSend(cmd, encoding = 'unicode') {
    return new Promise((resolve, reject) => {
        console.log('entered ppk write');
        const slipPackage = [];
        if (cmd.constructor !== Array) {
            console.log('PPKWrite: Supplied cmd is not an array');
            reject('Command is not an array');
        }

        if (encoding === 'unicode') {
            slipPackage.push(STX);
        } else { // raw
            slipPackage.push(STX);
        }
        cmd.forEach(byte => {
            if (byte === STX || byte === ETX || byte === ESC) {
                slipPackage.push(ESC);
                slipPackage.push(byte ^ 0x20);
            } else {
                slipPackage.push(byte);
            }
        });
        slipPackage.push(ETX);
        console.log(slipPackage.map(n => n.toString(16)));

        RTT.write(0, slipPackage, (err, writtenLength) => {
            if (err) {
                reject('RTT Write Failed: ', err);
            } else {
                resolve(writtenLength);
            }
        });
    });
}

export function stop() {
    if (!PPK.port) {
        console.log('No serial port provided');
        return;
    }
    PPK.port.removeListener('data', parseMeasurementData);
    RTT.stop(err => {
        console.log(err);
    });
}

const promiseTimeout = (ms, promise) => {
    // Create a promise that rejects in <ms> milliseconds
    const timeout = new Promise((resolve, reject) => {
        const id = setTimeout(() => {
            clearTimeout(id);
            reject('Timed out in ', ms, 'ms.');
        }, ms);
    });

    // Returns a race between our timeout and the passed in promise
    return Promise.race([
        promise,
        timeout,
    ]);
};

/* Called when start button is pressed */
export async function start(serialNumber) {
    const waitForStart = () => new Promise((resolve, reject) => {
        RTT.start(serialNumber, {}, (err, down, up) => {
            if (err) {
                reject(err);
            }
            resolve();
        });
    });

    const getHardwareStates = () => new Promise((resolve, reject) => {
        setTimeout(RTT.read(0, 200, (err, string) => {
            if (err) {
                reject(err);
            }
            resolve(string);
        }), 100);
    });

    const startRTT = promiseTimeout(0, await waitForStart());
    startRTT.catch(() => {
        console.log('Failed to open RTT channel');
    });

    const waitForState = promiseTimeout(5000, await getHardwareStates());
    let resLo;
    let resMid;
    let resHi;
    let userRes;
    let userResLo;
    let userResMid;
    let userResHi;
    let version;
    let calibrationStatus;
    let boardID;
    let vdd;
    await waitForState.then(stateData => {
        try {
            version = stateData.split('VERSION ')[1].slice(0, 5);
            calibrationStatus = stateData.split('CAL:')[1].slice(1, 2);
            boardID = stateData.split('Board ID ')[1].slice(0, 7);

            const voltageRefs = stateData.split('Refs ')[1];
            vdd = parseInt(voltageRefs.split('VDD: ')[1].slice(0, 5), 10);
            // const hi = voltageRefs.split('HI: ')[1].slice(0, 5);
            // const lo = voltageRefs.split('LO: ')[1].slice(0, 5);

            if (calibrationStatus) {
                resLo = parseFloat(stateData.split('R1:')[1].slice(0, 8), 10);
                resMid = parseFloat(stateData.split('R2:')[1].slice(0, 7), 10);
                resHi = parseFloat(stateData.split('R3:')[1].slice(0, 6), 10);
            }

            if (stateData.includes('USER SET')) {
                userRes = stateData.split('USER SET ')[1];
                userResLo = parseFloat(userRes.split('R1:')[1].slice(0, 8), 10);
                userResMid = parseFloat(userRes.split('R2:')[1].slice(0, 7), 10);
                userResHi = parseFloat(userRes.split('R3:')[1].slice(0, 6), 10);
            }
        } catch (error) {
            throw new Error('Unable to read metadata from PPK');
        }
    }).catch(error => {
        console.log(error.message);
    });
    return {
        version,
        calibrationStatus,
        resLo,
        resMid,
        resHi,
        userResLo,
        userResMid,
        userResHi,
        boardID,
        vdd,
    };
}

export async function read() {
    const readCallback = (err, string, rawbytes /* , time */) => {
        // console.log(time);
        parseMeasurementData(rawbytes);
        setTimeout(RTT.read(0, 10000, readCallback), 10);
    };
    RTT.read(0, 100, readCallback);
}
