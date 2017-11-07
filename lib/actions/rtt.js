import EventEmitter from 'events';

// Local copy of serial port instance
import { RTT } from 'pc-nrfjprog-js';
import { PPK } from './PPKActions';

/*  RTT  */

// RTT.start(serialnumber, {}, (err, down, up));
// RTT.stop((err));
// RTT.write(channelIndex, data, (err, writtenLength)); // string or array
// RTT.read(channelIndex, length, (err, string, rawbytes));

const STX = 0x02;
const ETX = 0x03;
const ESC = 0x1F;

const NRF_EGU0_BASE = 0x40014000;
const TASKS_TRIGGER0_OFFSET = 0;

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

// const MEAS_ADC_POS = 0;
const MEAS_ADC_MSK = 0x3FFF;

const MEAS_RES_HI = 1.8;
const MEAS_RES_MID = 28;
const MEAS_RES_LO = 500;

export const PPKCmd = {
    TriggerSet: 0x01,          // following trigger of type int16
    AvgNumSet: 0x02,          // Number of samples x16 to average over
    TriggerWindowSet: 0x03,      // following window of type unt16
    TriggerIntervalSet: 0x04,
    TriggerSingleSet: 0x05,
    AverageStart: 0x06,      // Previously Run
    AverageStop: 0x07,     // Previously Stop
    RangeSet: 0x08,
    LCDSet: 0x09,
    TriggerStop: 0x0A,
    CalibrateOffset: 0x0B,
    DutToggle: 0x0C,
    RegulatorSet: 0x0D,
    VrefLoSet: 0x0E,
    VrefHiSet: 0x0F,
    TriggerExtToggle: 0x11,
    ResUserSet: 0x12,
};

// Buffer for all received data
const serialBuf = [];
// Serial transmission state
let serialState = MODE_IDLE;
// Array to hold the valid bytes of the payload
let dataPayload = [];

export const events = new EventEmitter();

export function read() {
    return new Promise(resolve => {
        resolve('VERSION 1.1.0\r\nNOTCALIBRA R1:510.000 R2:28.000 R3:1.800 Board ID 9889072\r\nUSER SET R1:510.000 R2:28.000 R3:1.800\r\nRefs VDD: 3000 HI: 15066 LO: 49200');
    });
}

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


function parseMeasurementData(data) {
    // Append all data on to serial_buf
    // console.log('data filter incoming');
    // console.log(data.filter(a => (a === STX || a === ETX || a === ESC)));
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
                } else if (dataPayload.length > 4) {
                    process.nextTick(handleTriggerDataSet.bind(this, dataPayload.slice()));
                }
                dataPayload = [];
                serialState = MODE_IDLE;
            } else if (byte === STX) {
                /*  Sometimes (~3%), for some reason, this happens. It shouldn't, but still.
                    Clearing the payload buffer will make the application survive and function,
                    but this should be investigated.
                */
                console.log('received stx in the middle');
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

export function stop() {
    if (!PPK.port) {
        console.log('No serial port provided');
        return;
    }
    PPK.port.removeListener('data', parseMeasurementData);
}

let rtt;
/* Called when start button is pressed */
export async function start() {
    rtt = new RTT();

    // const readOne = () => new Promise(resolve => {
    //     rtt.read(0, 100, (err, string, rawbytes) => {
    //         // console.log(err);
    //         // console.log(string);
    //         // console.log(rawbytes);
    //         parseMeasurementData(rawbytes);
    //         resolve();
    //     });
    // });

    const waitForStart = () => new Promise(resolve => {
        rtt.start(681356765, {}, (err, down, up) => {
            console.log(err);
            console.log(down);
            console.log(up);
            resolve();
        });
    });

    await waitForStart();
    // for (let i = 0; i < 10000; i += 1) await readOne();
    const readCallback = (err, string, rawbytes) => {
        // console.log(err);
        // console.log(string);
        // console.log(rawbytes);
        parseMeasurementData(rawbytes);
        // resolve();
        rtt.read(0, 100, readCallback);
    };
    rtt.read(0, 100, readCallback);

    // rtt.write([]);
    // if (!PPK.port) {
    //     console.log('No serial port provided');
    //     return;
    // }
    stop(); // Stop the trigger plot
    // PPK.port.on('data', parseMeasurementData);
}

function rttwrite(/* Array */ val) {
    console.log('Entered rtt write');
    console.log(val);
}

function nrfjprogWriteU32() {
    console.log('wrote to EGU');
}
function ppkReadRttPacket() {
    nrfjprogWriteU32(NRF_EGU0_BASE + TASKS_TRIGGER0_OFFSET, 0x00000001, 0);
}
export function PPKCommandSend(cmd, encoding = 'unicode') {
    console.log('entered ppk write');
    const slipPackage = [];
    if (cmd.constructor !== Array) {
        console.log('PPKWrite: Supplied cmd is not an array');
        return;
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
    rttwrite(slipPackage);
    ppkReadRttPacket();

    // nrfprog.go();
}

