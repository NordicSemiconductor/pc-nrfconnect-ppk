/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
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

import SerialDevice from './serialDevice';

import {
    // ADC_SAMPLING_TIME_US,
    // AVERAGE_TIME_US,

    STX, ETX, ESC,
    ADC_MULT,

    MEAS_RANGE_0,
    MEAS_RANGE_1,
    MEAS_RANGE_2,
    MEAS_RANGE_3,
    MEAS_RANGE_4,

    MEAS_RANGE_POS,
    MEAS_RANGE_MSK,
    MEAS_ADC_MSK,

    // MEAS_RES_HI,
    // MEAS_RES_MID,
    // MEAS_RES_LO,
} from '../constants';

const MEAS_RES_0 = 1000.0;
const MEAS_RES_1 = 100.0;
const MEAS_RES_2 = 10.0;
const MEAS_RES_3 = 1.0;
const MEAS_RES_4 = 0.06;
let device = null;

/**
    Metadata expected from the PPK firmware is a multiline string
    in the following format, where the parts in brackets are optional:

VERSION {version} CAL: {calibrationStatus} [R1: {resLo} R2: {resMid} R3: {resHi}] Board ID {boardID}
[USER SET R1: {userResLo} R2: {userResMid} R3: {userResHi}]
Refs VDD: {vdd} HI: {vrefHigh} LO: {vrefLow}

 */
const MetadataParser = new RegExp([
    'VERSION\\s*([^\\s]+)\\s*CAL:\\s*(\\d+)\\s*',
    '(?:R1:\\s*([\\d.]+)\\s*R2:\\s*([\\d.]+)\\s*R3:\\s*([\\d.]+))?\\s*Board ID\\s*([0-9A-F]+)\\s*',
    '(?:USER SET\\s*R1:\\s*([\\d.]+)\\s*R2:\\s*([\\d.]+)\\s*R3:\\s*([\\d.]+))?\\s*',
    'Refs\\s*VDD:\\s*(\\d+)\\s*HI:\\s*(\\d.+)\\s*LO:\\s*(\\d+)',
].join(''));

export const events = new EventEmitter();

function getAdcResult(adcVal, range) {
    switch (range) {
        case MEAS_RANGE_0:
            return (adcVal * (ADC_MULT / MEAS_RES_0));
        case MEAS_RANGE_1:
            return (adcVal * (ADC_MULT / MEAS_RES_1));
        case MEAS_RANGE_2:
            return (adcVal * (ADC_MULT / MEAS_RES_2));
        case MEAS_RANGE_3:
            return (adcVal * (ADC_MULT / MEAS_RES_3));
        case MEAS_RANGE_4:
            return (adcVal * (ADC_MULT / MEAS_RES_4));
        default:
    }
    throw new Error(`Invalid range ${range}, value: ${adcVal}`);
}

function handleRawDataSet(adcValue) {
    try {
        // eslint-disable-next-line no-bitwise
        const currentMeasurementRange = (adcValue & MEAS_RANGE_MSK) >> MEAS_RANGE_POS;
        // eslint-disable-next-line no-bitwise
        const adcResult = (adcValue & MEAS_ADC_MSK) << 3;
        const averageFloatValue = getAdcResult(adcResult, currentMeasurementRange);
        // Only fire the event, if the buffer data is valid
        events.emit('average', averageFloatValue * 1e6);
    } catch (e) {
        console.log(e.message, 'original value', adcValue);
        // to keep timestamp consistent, undefined must be emitted
        events.emit('average', undefined);
        events.emit('warning', 'Average data error2, restart application', e);
    }
}

const buffers = [];
let throttleUpdates = false;
let remainder;
function parseMeasurementData(rawbytes) {
    buffers.push(rawbytes);
    if (throttleUpdates) {
        return;
    }
    throttleUpdates = true;
    requestAnimationFrame(() => {
        buffers.forEach(buf => {
            let ofs = 0;
            if (remainder !== undefined) {
                const first = buf.readUInt8(0);
                // eslint-disable-next-line no-bitwise
                handleRawDataSet(remainder << 8 + first);
                ofs = 1;
                remainder = undefined;
            }
            for (; ofs < buf.length - 1; ofs += 2) {
                handleRawDataSet(buf.readUInt16LE(ofs));
            }
            if (ofs !== buf.length) {
                remainder = buf.readUInt8(ofs);
            }
        });
        buffers.splice(0);
        throttleUpdates = false;
    });
}

export function setResistors(
    // low, mid, high,
) {
    // MEAS_RES_HI = high;
    // MEAS_RES_MID = mid;
    // MEAS_RES_LO = low;
}

export function PPKCommandSend(cmd) {
    const slipPackage = [];
    if (cmd.constructor !== Array) {
        events.emit('error', 'Unable to issue command', 'Command is not an array');
        return undefined;
    }

    slipPackage.push(STX);

    cmd.forEach(byte => {
        if (byte === STX || byte === ETX || byte === ESC) {
            // eslint-disable-next-line no-bitwise
            slipPackage.push(ESC, byte ^ 0x20);
        } else {
            slipPackage.push(byte);
        }
    });
    slipPackage.push(ETX);

    return device.write(slipPackage);
}

export async function stop() {
    if (!device) {
        return;
    }
    await device.stop();
    device = null;
}

/* Called when selecting device */
export async function start(descr) {
    device = new SerialDevice(descr, events, parseMeasurementData);
    const hardwareStates = await device.start();
    console.log(hardwareStates);
    const match = MetadataParser.exec(hardwareStates);
    if (!match) {
        events.emit('error', 'Failed to read PPK metadata');
        return undefined;
    }

    const [, version, calibrationStatus,,,, boardID] = match;
    let [,,,
        resLo, resMid, resHi,,
        userResLo, userResMid, userResHi,
        vdd, vrefHigh, vrefLow,
    ] = match;

    if (vdd) vdd = parseInt(vdd, 10);
    if (vrefHigh) vrefHigh = parseInt(vrefHigh, 10);
    if (vrefLow) vrefLow = parseInt(vrefLow, 10);
    if (resLo) resLo = parseFloat(resLo);
    if (resMid) resMid = parseFloat(resMid);
    if (resHi) resHi = parseFloat(resHi);
    if (userResLo) userResLo = parseFloat(userResLo);
    if (userResMid) userResMid = parseFloat(userResMid);
    if (userResHi) userResHi = parseFloat(userResHi);

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
        vrefHigh,
        vrefLow,
    };
}
