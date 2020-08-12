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

import { fork } from 'child_process';
import { getAppDir } from 'nrfconnect/core';
import path from 'path';

import Device from './abstractDevice';
import PPKCmd from '../constants';

/* eslint-disable no-bitwise */

const generateMask = (bits, pos) => ({ pos, mask: ((2 ** bits) - 1) << pos });
const MEAS_ADC = generateMask(14, 0);
const MEAS_RANGE = generateMask(3, 14);
const MEAS_LOGIC = generateMask(8, 24);

const getMaskedValue = (value, { mask, pos }) => ((value & mask) >> pos);

const alpha = 0.04;

class SerialDevice extends Device {
    adcMult = (1.2 / 163840);

    modifiers = {
        r: [1031.64, 101.65, 10.15, 0.94, 0.043],
        gs: [1, 1, 1, 1, 1],
        gi: [1, 1, 1, 1, 1],
        o: [0, 0, 0, 0, 0],
        s: [0, 0, 0, 0, 0],
        i: [0, 0, 0, 0, 0],
        ug: [1, 1, 1, 1, 1],
    };

    adcSamplingTimeUs = 10;

    resistors = { hi: 1.8, mid: 28, lo: 500 };

    vddRange = { min: 800, max: 5000 };

    constructor(deviceInfo) {
        super();

        this.comName = deviceInfo.serialport.comName;
        this.child = fork(path.resolve(getAppDir(), 'worker', 'serialDevice.js'));
        this.parser = null;

        this.child.on('message', m => {
            if (!this.parser) {
                console.error('Program logic error, parser is not set.');
                return;
            }
            if (m.data) {
                this.parser(Buffer.from(m.data));
                return;
            }
            console.log(`message: ${JSON.stringify(m)}`);
        });
        this.child.on('close', code => {
            if (code) {
                console.log(`Child process exited with code ${code}`);
            } else {
                console.log('Child process cleanly exited');
            }
        });
    }

    getAdcResult(range, adcVal) {
        const resultWithoutGain = ((adcVal - this.modifiers.o[range])
                                * (this.adcMult / this.modifiers.r[range]));
        let adc = (resultWithoutGain
            * (this.modifiers.gs[range] * resultWithoutGain + this.modifiers.gi[range])
            + (this.modifiers.s[range] * (this.currentVdd / 1000) + this.modifiers.i[range]));

        this.rollingAvg = (this.rollingAvg === undefined)
            ? adc
            : (alpha * adc) + (1.0 - alpha) * this.rollingAvg;

        if (this.prevRange === undefined) {
            this.prevRange = range;
        }

        if (this.prevRange !== range || this.afterSpike > 0) {
            if (this.prevRange !== range) {
                // number of measurements after the spike which still to be averaged
                this.afterSpike = 3;
            }
            adc = this.rollingAvg;
            this.afterSpike -= 1;
        }
        this.prevRange = range;

        return adc;
    }

    start() {
        this.child.send({ open: this.comName });
        return this.getMetadata();
    }

    parseMeta(m) {
        // if (m.calibrated) ?
        Object.keys(this.modifiers).forEach(k => {
            for (let i = 0; i < 5; i += 1) {
                this.modifiers[k][i] = m[`${k}${i}`] || this.modifiers[k][i];
            }
        });
        return m;
    }

    stop() {
        this.child.kill();
    }

    sendCommand(cmd) {
        if (cmd.constructor !== Array) {
            this.emit('error', 'Unable to issue command', 'Command is not an array');
            return undefined;
        }
        if (cmd[0] === PPKCmd.AverageStart) {
            this.rollingAvg = undefined;
            this.prevRange = undefined;
            this.afterSpike = 0;
        }
        this.child.send({ write: cmd });
        return Promise.resolve(cmd.length);
    }

    handleRawDataSet(adcValue) {
        try {
            const currentMeasurementRange = Math.min(
                getMaskedValue(adcValue, MEAS_RANGE), this.modifiers.r.length,
            );
            const adcResult = getMaskedValue(adcValue, MEAS_ADC) * 4;
            const bits = getMaskedValue(adcValue, MEAS_LOGIC);
            const value = this.getAdcResult(currentMeasurementRange, adcResult) * 1e6;
            // Only fire the event, if the buffer data is valid
            this.onSampleCallback({ value, bits });
        } catch (err) {
            console.log(err.message, 'original value', adcValue);
            // to keep timestamp consistent, undefined must be emitted
            this.onSampleCallback({});
            this.emit('warning', 'Average data error2, restart application', err);
        }
    }

    remainder = Buffer.alloc(0);

    parseMeasurementData(buf) {
        const sampleSize = 4;
        let ofs = this.remainder.length;
        const first = Buffer.concat(
            [this.remainder, buf.subarray(0, sampleSize - ofs)], sampleSize,
        );
        ofs = sampleSize - ofs;
        this.handleRawDataSet(first.readUIntLE(0, sampleSize));
        for (; ofs <= buf.length - sampleSize; ofs += sampleSize) {
            this.handleRawDataSet(buf.readUIntLE(ofs, sampleSize));
        }
        this.remainder = buf.subarray(ofs);
    }

    getMetadata() {
        let metadata = '';
        return new Promise(resolve => {
            this.parser = data => {
                metadata = `${metadata}${data}`;
                if (metadata.includes('END')) {
                    // hopefully we have the complete string, HW is the last line
                    this.parser = this.parseMeasurementData.bind(this);
                    resolve(metadata);
                }
            };
            this.sendCommand([PPKCmd.GetMetadata]);
        })
            // convert output string json:
            .then(m => m.replace('END', '')
                .trim()
                .toLowerCase()
                .replace(/-nan/g, 'null')
                .replace(/\n/g, ',\n"')
                .replace(/: /g, '": '))
            .then(m => `{"${m}}`)
            // resolve with parsed object:
            .then(JSON.parse);
    }

    // Capability methods

    ppkSetPowerMode(...args) {
        return this.sendCommand([PPKCmd.SetPowerMode, ...args]);
    }
}

export default SerialDevice;
