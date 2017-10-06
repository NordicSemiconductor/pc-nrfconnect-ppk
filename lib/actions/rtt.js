import EventEmitter from 'events';

// Local copy of serial port instance
let port;

const STX = 0x02;
const ETX = 0x03;
const ESC = 0x1F;

const MODE_IDLE = 0;
const MODE_RECEIVE = 1;
const MODE_ESC_RECV = 2;

// const ADC_REF = 0.6;
// const ADC_GAIN = 4.0;
// const ADC_MAX = 8192.0;

// const MEAS_RANGE_NONE = 0;
// const MEAS_RANGE_LO = 1;
// const MEAS_RANGE_MID = 2;
// const MEAS_RANGE_HI = 3;
// const MEAS_RANGE_INVALID = 4;

// const MEAS_RANGE_POS = 14;
// const MEAS_RANGE_MSK = (3 << 14);

// const MEAS_ADC_POS = 0;
// const MEAS_ADC_MSK = 0x3FFF;


// Buffer for all received data
const serialBuf = [];
// Serial transmission state
let serialState = MODE_IDLE;

export const events = new EventEmitter();

export function read() {
    return new Promise(resolve => {
        resolve('VERSION 1.1.0\r\nNOTCALIBRA R1:510.000 R2:28.000 R3:1.800 Board ID 9889072\r\nUSER SET R1:510.000 R2:28.000 R3:1.800\r\nRefs VDD: 3000 HI: 15066 LO: 49200');
    });
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
    // empty
}

function parseMeasurementData(data) {
    // Append all data on to serial_buf
    serialBuf.splice(serialBuf.length, 0, ...data);
    // Array to hold the valid bytes of the payload
    let dataPayload = [];

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
            } else if (byte === ETX) {
                console.log(dataPayload.length);
                if (dataPayload.length === 4) {
                    handleAverageDataSet(dataPayload);
                } else {
                    handleTriggerDataSet(dataPayload);
                }
                dataPayload = [];
                serialState = MODE_IDLE;
            } else if (byte === STX) {
                // Shouldn't be necessary...
                dataPayload = [];
            } else {
                // Input the value at the end of floatBuffer
                dataPayload.splice(dataPayload.length, 0, byte);
            }
        } else if (serialState === MODE_ESC_RECV) {
            // XOR the byte after the ESC-character
            // Remove these two bytes, the ESC and the valid one

            /* eslint-disable no-bitwise */
            const modbyte = (byte ^ 0x20);
            dataPayload.concat(new Uint8Array(modbyte));
            serialState = MODE_RECEIVE;
        }
    }
}

export function stop() {
    port.removeListener('data', parseMeasurementData);
    // clearInterval(interval);
}

/* Gives a reference to the serial port instance to the RTT module */
export function setPort(serialPort) {
    port = serialPort;
}

/* Called when the trigger button is pressed */
export function trigger() {
    if (port == null) {
        console.log('No serial port provided');
        return;
    }
    stop(); // Stop the trigger plot
    port.on('data', parseMeasurementData);
}

/* Called when average button is pressed */
export function average() {
    if (port == null) {
        console.log('No serial port provided');
        return;
    }
    stop(); // Stop the trigger plot
    port.on('data', parseMeasurementData);
}
