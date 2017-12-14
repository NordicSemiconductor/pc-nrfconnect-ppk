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

// For electron runtime optimization we need to avoid operator-assiment:
/* eslint operator-assignment: off */

import EventEmitter from 'events';

// Local copy of serial port instance
import { RTT } from 'pc-nrfjprog-js';

import {
    ADC_SAMPLING_TIME_US,
    AVERAGE_TIME_US,
    MAX_RTT_READ_LENGTH,
    WAIT_FOR_START,
    WAIT_FOR_HW_STATES,

    STX, ETX, ESC,
    ADC_MULT,

    MEAS_RANGE_NONE,
    MEAS_RANGE_LO,
    MEAS_RANGE_MID,
    MEAS_RANGE_HI,
    MEAS_RANGE_INVALID,

    MEAS_RANGE_POS,
    MEAS_RANGE_MSK,
    MEAS_ADC_MSK,
    MEAS_RES_HI,
    MEAS_RES_MID,
    MEAS_RES_LO,
} from '../constants';

let isRttOpen = false;

/**
    Metadata expected from the PPK firmware is a multiline string
    in the following format, where the parts in brackets are optional:

VERSION {version} CAL: {calibrationStatus} [R1: {resLo} R2: {resMid} R3: {resHi}] Board ID {boardID}
[USER SET R1: {userResLo} R2: {userResMid} R3: {userResHi}]
Refs VDD: {vdd} HI: {vddHi} LO: {vddLo}

 */
const MetadataParser = new RegExp([
    'VERSION\\s*([^\\s]+)\\s*CAL:\\s*(\\d+)\\s*',
    '(?:R1:\\s*([\\d.]+)\\s*R2:\\s*([\\d.]+)\\s*R3:\\s*([\\d.]+))?\\s*Board ID\\s*([0-9A-F]+)\\s*',
    '(?:USER SET\\s*R1:\\s*([\\d.]+)\\s*R2:\\s*([\\d.]+)\\s*R3:\\s*([\\d.]+))?\\s*',
    'Refs\\s*VDD:\\s*(\\d+)\\s*HI:\\s*(\\d.+)\\s*LO:\\s*(\\d+)',
].join(''));

export const events = new EventEmitter();

let byteHandlerFunc;
let timestamp = 0;
// Array to hold the valid bytes of the payload
let dataPayload = [];

function getAdcResult(adcVal, range) {
    switch (range) {
        case MEAS_RANGE_LO:
            return adcVal * (ADC_MULT / MEAS_RES_LO);
        case MEAS_RANGE_MID:
            return adcVal * (ADC_MULT / MEAS_RES_MID);
        case MEAS_RANGE_HI:
            return adcVal * (ADC_MULT / MEAS_RES_HI);
        case MEAS_RANGE_NONE:
            throw new Error('Measurement range not detected');
        case MEAS_RANGE_INVALID:
        default:
    }
    throw new Error('Invalid range');
}


// Allocate memory for the float value
const averageBuf = new ArrayBuffer(4);
// Typed array used for viewing the final 4-byte array as uint8_t values
const serialUint8View = new Uint8Array(averageBuf);
// View for the final float value that is pushed to the chart
const viewFloat = new Float32Array(averageBuf);

function handleAverageDataSet(data, ts) {
    try {
        serialUint8View.set(data);
    } catch (e) {
        console.log('Failed setting uint8_t view');
        console.log(data);
    }
    try {
        const averageFloatValue = viewFloat[0];
        // Only fire the event, if the buffer data is valid
        events.emit('average', averageFloatValue, ts);
    } catch (e) {
        console.log('Probably wrong length of the float value');
        console.log(e);
    }
}

function handleTriggerDataSet(data, ts) {
    const buf = new ArrayBuffer(data.length);
    const viewUint8 = new Uint8Array(buf);
    const resultBuffer = [];

    viewUint8.set(data);
    const view = new DataView(buf);
    for (let i = 0; i < data.length; i = i + 2) {
        const adcValue = view.getUint16(i, true);

        // eslint-disable-next-line no-bitwise
        const currentMeasurementRange = (adcValue & MEAS_RANGE_MSK) >> MEAS_RANGE_POS;

        // eslint-disable-next-line no-bitwise
        const adcResult = (adcValue & MEAS_ADC_MSK);
        const sample = getAdcResult(adcResult, currentMeasurementRange) * 1e6;
        resultBuffer.push(sample);
    }
    console.log('Pushed trigger data of size: ', resultBuffer.length);

    const timeOfLastValue = ts + (ADC_SAMPLING_TIME_US * resultBuffer.length);
    events.emit('trigger', resultBuffer, timeOfLastValue);
}

function convertSysTick2MicroSeconds(data) {
    const buf = new ArrayBuffer(data.length);
    const viewUint8 = new Uint8Array(buf);

    viewUint8.set(data);
    const view = new DataView(buf);
    const sysTicks = view.getUint32(data, true);

    return sysTicks * ADC_SAMPLING_TIME_US;
}

const byteHandlers = {
    MODE_RECEIVE: byte => {
        /*  ESC received means that a valid data byte was either
         * STX, ETX or ESC. Two bytes are sent, ESC and then valid ^ 0x20
         */
        switch (byte) {
            case ESC:
                // Don't do anything here, but wait for next byte and XOR it
                byteHandlerFunc = byteHandlers.MODE_ESC_RECV;
                // End of transmission, send to average or trigger handling
                return;
            case ETX: {
                if (dataPayload.length === 4) {
                    process.nextTick(
                        handleAverageDataSet.bind(null, dataPayload, timestamp));
                    timestamp = timestamp + AVERAGE_TIME_US;
                } else if (dataPayload.length === 5) {
                    timestamp = convertSysTick2MicroSeconds(dataPayload.slice(0, 4));
                } else {
                    process.nextTick(
                        handleTriggerDataSet.bind(null, dataPayload, timestamp));
                }
                dataPayload = [];

                // this eats STX, if we remove that this is not needed:
                byteHandlerFunc = byteHandlers.MODE_RECEIVE;

                return;
            }
            default:
                // Input the value at the end of result array
                dataPayload.push(byte);
        }
    },
    MODE_ESC_RECV: byte => {
        // XOR the byte after the ESC-character
        // Remove these two bytes, the ESC and the valid one

        /* eslint-disable no-bitwise */
        const modbyte = (byte ^ 0x20);
        dataPayload.push(modbyte);
        byteHandlerFunc = byteHandlers.MODE_RECEIVE;
    },
};

byteHandlerFunc = byteHandlers.MODE_RECEIVE;

function parseMeasurementData(rawbytes) {
    rawbytes.forEach(byte => byteHandlerFunc(byte));
}

export function PPKCommandSend(cmd) {
    return new Promise((resolve, reject) => {
        console.log('entered ppk write');
        const slipPackage = [];
        if (cmd.constructor !== Array) {
            console.log('PPKWrite: Supplied cmd is not an array');
            return reject('Command is not an array');
        }

        slipPackage.push(STX);

        cmd.forEach(byte => {
            if (byte === STX || byte === ETX || byte === ESC) {
                slipPackage.push(ESC, byte ^ 0x20);
            } else {
                slipPackage.push(byte);
            }
        });
        slipPackage.push(ETX);
        console.log(`slipPackage: '${slipPackage.map(n => n.toString(16)).join('')}'`);

        RTT.write(0, slipPackage, (err, writtenLength) => {
            if (err) {
                return reject('RTT Write Failed: ', err);
            }
            return resolve(writtenLength);
        });

        return undefined;
    });
}

export async function stop() {
    if (!isRttOpen) {
        console.log('RTT is already closed.');
        return;
    }
    isRttOpen = false;
    await new Promise(resolve => {
        RTT.stop(err => {
            if (err) {
                console.error(err);
            }
            resolve();
        });
    });
}

const promiseTimeout = (ms, promise) => {
    // Create a promise that rejects in <ms> milliseconds
    const timeout = new Promise((resolve, reject) => {
        setTimeout(reject.bind(null, new Error(`Timed out in ${ms} ms.`)), ms);
    });

    // Returns a race between our timeout and the passed in promise
    return Promise.race([
        promise,
        timeout,
    ]);
};

function readRTT(length) {
    return new Promise((resolve, reject) => {
        RTT.read(0, length, (err, string, rawbytes, time) => {
            if (err) {
                return reject(new Error(err));
            }
            return resolve({ string, rawbytes, time });
        });
    });
}

/* Called when selecting device */
export async function start(serialNumber) {
    const waitForStart = () => new Promise((resolve, reject) => {
        RTT.start(serialNumber, {}, err => {
            if (err) {
                return reject(err);
            }
            return resolve();
        });
    });

    const getHardwareStates = readRTT.bind(null, 200);

    try {
        await promiseTimeout(WAIT_FOR_START, waitForStart());
    } catch (err) {
        console.error('Failed to open RTT channel', err);
    }

    try {
        const { string } = await promiseTimeout(WAIT_FOR_HW_STATES, getHardwareStates());
        const match = MetadataParser.exec(string);

        const [, version, calibrationStatus,,,, boardID] = match;
        let [,,,
            resLo, resMid, resHi,,
            userResLo, userResMid, userResHi,
            vdd, // vddHi, vddLo
        ] = match;

        if (vdd) vdd = parseInt(vdd, 10);
        if (resLo) resLo = parseFloat(resLo, 10);
        if (resMid) resMid = parseFloat(resMid, 10);
        if (resHi) resHi = parseFloat(resHi, 10);
        if (userResLo) userResLo = parseFloat(userResLo, 10);
        if (userResMid) userResMid = parseFloat(userResMid, 10);
        if (userResHi) userResHi = parseFloat(userResHi, 10);
        isRttOpen = true;

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
    } catch (err) {
        console.error('Failed to open RTT channel');
        throw err;
    }
}

export async function read() {
    if (!isRttOpen) return;
    try {
        const { rawbytes } = await readRTT(MAX_RTT_READ_LENGTH);
        if (rawbytes && rawbytes.length) {
            process.nextTick(parseMeasurementData.bind(null, rawbytes));
        }
        process.nextTick(read);
    } catch (err) {
        console.error(err);
    }
}
