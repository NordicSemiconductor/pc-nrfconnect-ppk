/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import EventEmitter from 'events';

let port;

const STX = 0x02;
const ETX = 0x03;
const ESC = 0x1F;

const MODE_IDLE = 0;
const MODE_RECEIVE = 1;
const MODE_ESC_RECV = 2;

let interval;

export const events = new EventEmitter();

export function read() {
    return new Promise(resolve => {
        resolve('VERSION 1.1.0\r\nNOTCALIBRA R1:510.000 R2:28.000 R3:1.800 Board ID 9889072\r\nUSER SET R1:510.000 R2:28.000 R3:1.800\r\nRefs VDD: 3000 HI: 15066 LO: 49200');
    });
}

// Average value to be sent
let averageFloatValue = 0;
// Buffer for all received data
const serialBuf = [];
// Transmission state
let serialState = MODE_IDLE;

function parseMeasurementData(data) {
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
                // console.log(dataPayload.length);
                try {
                    serialUint8View.set(dataPayload);
                } catch (e) {
                    console.log('Failed setting uint8_t view');
                    console.log(dataPayload);
                }
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
}

export function stop() {
    port.removeListener('data', parseMeasurementData);
    clearInterval(interval);
}

let t = 0;
export function trigger() {
    stop();
    interval = setInterval(() => {
        for (let i = 0; i < 3850; i += 1) {
            t += Math.round(Math.random() * 100) - 50;
            if (t < 0) t = 0;
            if (t > 65535) t = 65535;
            events.emit('trigger', t);
        }
    }, 50);
}

/* Gives a reference to the serial port instance to the RTT module */
export function setPort(serialPort) {
    port = serialPort;
}

/* Called when average button is pressed */
export function average() {
    if (port == null) {
        console.log('No serial port provided');
        return;
    }
    stop();
    port.on('data', parseMeasurementData);
}
