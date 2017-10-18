import EventEmitter from 'events';

// Local copy of serial port instance
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

const MEAS_ADC_POS = 0;
const MEAS_ADC_MSK = 0x3FFF;

const MEAS_RES_HI = 1.8;
const MEAS_RES_MID = 28;
const MEAS_RES_LO = 500;

// Buffer for all received data
let serialBuf = [];
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

function handleAverageDataSet(data) {
    // Average value to be sent to chart
    let averageFloatValue = 0;
    // Allocate memory for the float value
    const buf = new ArrayBuffer(4);
    // Typed array used for viewing the final 4-byte array as uint8_t values
    const serialUint8View = new Uint8Array(buf);
    // View for the final float value that is pushed to the chart
    const viewFloat = new Float32Array(buf);

    try {
        serialUint8View.set(data);
    } catch (e) {
        console.log('Failed setting uint8_t view');
        console.log(data);
    }
    try {
        averageFloatValue = viewFloat[0];
        // Only fire the event, if the buffer data is valid
        events.emit('average', averageFloatValue);
    } catch (e) {
        console.log('Probably wrong length of the float value');
        console.log(e);
    }

    averageFloatValue = 0;
}

function handleTriggerDataSet(data) {
    const buf = new ArrayBuffer(data.length);
    const viewUint8 = new Uint8Array(buf);
    const resultBuffer = [];
    let currentMeasurementRange = null;

    viewUint8.set(data);
    console.log('Trigger length: ', data.length);
    for (let i = 0; i < data.length; i += 2) {
        const adcValue = new DataView(buf).getUint16(i, true);

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
    serialBuf = serialBuf.concat(Array.from(data));
    while (serialBuf.length !== 0) {
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
                    handleAverageDataSet(dataPayload);
                } else if (dataPayload.length > 4) {
                    handleTriggerDataSet(dataPayload);
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

/* Called when start button is pressed */
export function start() {
    if (!PPK.port) {
        console.log('No serial port provided');
        return;
    }
    stop(); // Stop the trigger plot
    PPK.port.on('data', parseMeasurementData);
}
