import EventEmitter from 'events';

/* Wilhelmsen */
const SerialPort = require('serialport');

let port;

const STX = 0x02;
const ETX = 0x03;
const ESC = 0x1F;

const MODE_IDLE = 0;
const MODE_RECEIVE = 1;
const MODE_ESC_RECV = 2;

function openPort(portnum) {
    port = new SerialPort(portnum, {
        baudRate: 1000000,
        rtscts: true,
    },
        err => {
            if (err) {
                console.log('Unable to open COM port:');
                console.log(err.message);
            }
        });
}

/* */
let interval;

export const events = new EventEmitter();

export function read() {
    /* Wilhelmsen */
    openPort('COM4');

    return new Promise(resolve => {
        resolve('VERSION 1.1.0\r\nNOTCALIBRA R1:510.000 R2:28.000 R3:1.800 Board ID 9889072\r\nUSER SET R1:510.000 R2:28.000 R3:1.800\r\nRefs VDD: 3000 HI: 15066 LO: 49200');
    });
}

export function stop() {
    clearInterval(interval);
}

let t = 0;
export function trigger() {
    stop();
    interval = setInterval(() => {
        for (let i = 0; i < 770; i += 1) {
            t += Math.round(Math.random() * 100) - 50;
            if (t < 0) t = 0;
            if (t > 65535) t = 65535;
            events.emit('trigger', t);
        }
    }, 10);
}

// Average value to be sent
let averageFloatValue = 0;
// Buffer for all received data
const serialBuf = [];
// Transmission state
let serialState = MODE_IDLE;

export function average() {
    port.on('data', data => {
        // Append all data on to serial_buf
        serialBuf.splice(serialBuf.length, 0, ...data);
        // Allocate memory for the float value
        const buf = new ArrayBuffer(4);
        // Typed array used for viewing the final 4-byte array as uint8_t values
        const serialUint8View = new Uint8Array(buf);
        // View for the final float value that is pushed to the chart
        const viewFloat = new Float32Array(buf);
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
                        // Let the floatBuffer be viewed as an uint8 array
                    serialUint8View.set(dataPayload);
                    try {
                        averageFloatValue = viewFloat[0];
                        // Only fire the event, if the buffer data is valid
                        events.emit('average', averageFloatValue);
                    } catch (e) {
                        console.log('Probably wrong length of the float value');
                        console.log(e);
                    } finally {
                        averageFloatValue = 0;
                        dataPayload = [];
                        serialState = MODE_IDLE;
                    }
                } else if (byte === STX) {
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
                dataPayload.splice(dataPayload.length, 0, modbyte);
                serialState = MODE_RECEIVE;
            }
        }
    });
}
