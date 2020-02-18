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
    // STX, ETX, ESC,
    ADC_MULT,

    MEAS_RES,
} from '../constants';

const MEAS_RES_0 = 1031.64;
const MEAS_RES_1 = 101.65;
const MEAS_RES_2 = 10.15;
const MEAS_RES_3 = 0.94;
const MEAS_RES_4 = 0.043;
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
        case 0:
            // 312.8 is an offset stored at boot, only used by range 0
            return ((adcVal - 312.8) * (ADC_MULT / MEAS_RES_0));
        case 1:
            return (adcVal * (ADC_MULT / MEAS_RES_1));
        case 2:
            return (adcVal * (ADC_MULT / MEAS_RES_2));
        case 3:
            return (adcVal * (ADC_MULT / MEAS_RES_3));
        case 4:
            return (adcVal * (ADC_MULT / MEAS_RES_4));
        default:
    }
    // throw new Error(`Invalid range ${range}, value: ${adcVal}`);
    return (adcVal * (ADC_MULT / MEAS_RES_4));
}

// eslint-disable-next-line no-bitwise
const generateMask = (bits, pos) => ({ pos, mask: ((2 ** bits) - 1) << pos });
const MEAS_ADC = generateMask(14, 0);
const MEAS_RANGE = generateMask(3, 14); // change this to (4, 13) when 4 bits will be used
const MEAS_LOGIC = generateMask(8, 24);

// eslint-disable-next-line no-bitwise
const getMaskedValue = (value, { mask, pos }) => ((value & mask) >> pos);

function handleRawDataSet(adcValue) {
    try {
        const currentMeasurementRange = getMaskedValue(adcValue, MEAS_RANGE);
        const adcResult = getMaskedValue(adcValue, MEAS_ADC);
        const logicResult = getMaskedValue(adcValue, MEAS_LOGIC);
        const averageFloatValue = getAdcResult((adcResult * 8), currentMeasurementRange);
        // Only fire the event, if the buffer data is valid
        events.emit('average', averageFloatValue * 1e6, logicResult);
    } catch (e) {
        console.log(e.message, 'original value', adcValue);
        // to keep timestamp consistent, undefined must be emitted
        events.emit('average');
        events.emit('warning', 'Average data error2, restart application', e);
    }
}

const buffers = [];
let throttleUpdates = false;
let remainder = Buffer.alloc(0);

function parseMeasurementDataGeneric(sampleSize, rawbytes) {
    buffers.push(rawbytes);
    if (throttleUpdates) {
        return;
    }
    throttleUpdates = true;
    requestAnimationFrame(() => {
        buffers.forEach(buf => {
            let ofs = remainder.length;
            const first = Buffer.concat([remainder, buf.subarray(0, sampleSize - ofs)], sampleSize);
            handleRawDataSet(first.readUIntLE(0, sampleSize));
            for (; ofs <= buf.length - sampleSize; ofs += sampleSize) {
                handleRawDataSet(buf.readUIntLE(ofs, sampleSize));
            }
            remainder = buf.subarray(ofs);
        });
        buffers.splice(0);
        throttleUpdates = false;
    });
}

const BYTES_PER_SAMPLES = 4;
const parseMeasurementData = parseMeasurementDataGeneric.bind(null, BYTES_PER_SAMPLES);

export function setResistors(low, mid, high) {
    MEAS_RES.hi = high;
    MEAS_RES.mid = mid;
    MEAS_RES.lo = low;
}

export function PPKCommandSend(cmd) {
    const slipPackage = [];
    if (cmd.constructor !== Array) {
        events.emit('error', 'Unable to issue command', 'Command is not an array');
        return undefined;
    }

    cmd.forEach(byte => {
        slipPackage.push(byte);
    });

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
