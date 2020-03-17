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
    ADC_MULT,
    MEAS_RES,
    PPKCmd,
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

const Modifiers = {
    r: [MEAS_RES_0, MEAS_RES_1, MEAS_RES_2, MEAS_RES_3, MEAS_RES_4],
    g: [1, 1, 1, 1, 1],
    o: [0, 0, 0, 0, 0],
}

const getAdcResult = (range, adcVal) => (
    ((adcVal - Modifiers.o[range]) * (ADC_MULT / Modifiers.r[range])) * Modifiers.g[range]
);

// eslint-disable-next-line no-bitwise
const generateMask = (bits, pos) => ({ pos, mask: ((2 ** bits) - 1) << pos });
const MEAS_ADC = generateMask(14, 0);
const MEAS_RANGE = generateMask(3, 14);
const MEAS_LOGIC = generateMask(8, 24);

// eslint-disable-next-line no-bitwise
const getMaskedValue = (value, { mask, pos }) => ((value & mask) >> pos);

function handleRawDataSet(adcValue) {
    try {
        const currentMeasurementRange = Math.min(
            getMaskedValue(adcValue, MEAS_RANGE), Modifiers.r.length,
        );
        const adcResult = getMaskedValue(adcValue, MEAS_ADC) * 8;
        const logicResult = getMaskedValue(adcValue, MEAS_LOGIC);
        const averageFloatValue = getAdcResult(currentMeasurementRange, adcResult);
        // Only fire the event, if the buffer data is valid
        events.average(averageFloatValue * 1e6, logicResult);
    } catch (e) {
        console.log(e.message, 'original value', adcValue);
        // to keep timestamp consistent, undefined must be emitted
        events.average();
        events.emit('warning', 'Average data error2, restart application', e);
    }
}

let remainder = Buffer.alloc(0);

function parseMeasurementDataGeneric(sampleSize, buf) {
    let ofs = remainder.length;
    const first = Buffer.concat([remainder, buf.subarray(0, sampleSize - ofs)], sampleSize);
    handleRawDataSet(first.readUIntLE(0, sampleSize));
    for (; ofs <= buf.length - sampleSize; ofs += sampleSize) {
        handleRawDataSet(buf.readUIntLE(ofs, sampleSize));
    }
    remainder = buf.subarray(ofs);
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

export async function close() {
    if (!device) {
        return;
    }
    await device.close();
    device = null;
}

function getMetadata() {
    let metadata = '';
    return new Promise(async resolve => {
        device.setParser(data => {
            metadata = `${metadata}${data}`;
            if (metadata.includes('HW')) {
                // hopefully we have the complete string, HW is the last line
                device.setParser(parseMeasurementData);
                resolve(metadata);
            }
        });
        await PPKCommandSend([PPKCmd.GetMetadata]);
    })
        // convert output string json:
        .then(m => m.trim()
            .toLowerCase()
            .replace(/-nan/g, 'null')
            .replace(/\n/g, ',\n"')
            .replace(/: /g, '": '))
        .then(m => `{"${m}}`)
        // resolve with parsed object:
        .then(JSON.parse);
}

/* Called when selecting device */
export async function open(descr) {
    device = new SerialDevice(descr);
    await device.open();
    const m = await getMetadata();

    // if (m.calibrated) ?
    Modifiers.r = [m.r0, m.r1, m.r2, m.r3, m.r4];
    Modifiers.g = [m.g0, m.g1, m.g2, m.g3, m.g4];
    Modifiers.o = [m.o0, m.o1, m.o2, m.o3, m.o4];

    console.log(Modifiers);
    return m;
}
