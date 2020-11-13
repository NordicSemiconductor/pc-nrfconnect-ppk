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

/* eslint-disable no-bitwise */

import nRFjprogjs from 'pc-nrfjprog-js';
import { logger } from 'nrfconnect/core';

import Device, { convertFloatToByteBuffer } from './abstractDevice';

import PPKCmd from '../constants';

export const SAMPLES_PER_AVERAGE = 10;

const MAX_RTT_READ_LENGTH = 1000; // anything up to SEGGER buffer size
const WAIT_FOR_START = 6000; // milliseconds
const WAIT_FOR_HW_STATES = 5000; // milliseconds
const STX = 0x02;
const ETX = 0x03;
const ESC = 0x1f;

const MEAS_RANGE_NONE = 0;
const MEAS_RANGE_LO = 1;
const MEAS_RANGE_MID = 2;
const MEAS_RANGE_HI = 3;
const MEAS_RANGE_INVALID = 4;
const MEAS_ADC_MSK = 0x3fff;
const MEAS_RANGE_POS = 14;

const MEAS_RANGE_MSK = 3 << 14;

/**
    Metadata expected from the PPK firmware is a multiline string
    in the following format, where the parts in brackets are optional:

    VERSION {version} CAL: {calStatus} [R1: {resLo} R2: {resMid} R3: {resHi}] Board ID {boardID}
    [USER SET R1: {userResLo} R2: {userResMid} R3: {userResHi}]
    Refs VDD: {vdd} HI: {vrefHigh} LO: {vrefLow}
 */
const MetadataParser = new RegExp(
    [
        'VERSION\\s*([^\\s]+)\\s*CAL:\\s*(\\d+)\\s*',
        '(?:R1:\\s*([\\d.]+)\\s*R2:\\s*([\\d.]+)\\s*R3:\\s*([\\d.]+))?\\s*Board ID\\s*([0-9A-F]+)\\s*',
        '(?:USER SET\\s*R1:\\s*([\\d.]+)\\s*R2:\\s*([\\d.]+)\\s*R3:\\s*([\\d.]+))?\\s*',
        'Refs\\s*VDD:\\s*(\\d+)\\s*HI:\\s*(\\d.+)\\s*LO:\\s*(\\d+)',
    ].join('')
);

const promiseTimeout = (ms, promise) =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timed out in ${ms} ms.`)), ms);
        }),
    ]);

const triggerLevelConv = triggerLevel => {
    const high = (triggerLevel >> 16) & 0xff;
    const mid = (triggerLevel >> 8) & 0xff;
    const low = triggerLevel & 0xff;
    return [high, mid, low];
};

class RTTDevice extends Device {
    // Allocate memory for the float value
    averageBuf = new ArrayBuffer(4);

    // Typed array used for viewing the final 4-byte array as uint8_t values
    serialUint8View = new Uint8Array(this.averageBuf);

    // View for the final float value that is pushed to the chart
    viewFloat = new Float32Array(this.averageBuf);

    triggerBuf = new ArrayBuffer(0);

    viewUint8 = new Uint8Array(this.triggerBuf);

    sysTickBuf = new ArrayBuffer(4);

    sysTickViewUint8 = new Uint8Array(this.sysTickBuf);

    sysTickView = new DataView(this.sysTickBuf);

    // (ADC_REF / (ADC_GAIN * ADC_MAX));
    adcMult = 0.6 / (4.0 * 8192.0);

    adcSamplingTimeUs = 13;

    resistors = { hi: 1.8, mid: 28.0, lo: 510.0 };

    vddRange = { min: 1850, max: 3600 };

    readloopRunning = false;

    averageRunning = false;

    triggerRunning = false;

    triggerWaiting = false;

    triggerWindowRange = { min: (450 * 13) / 1e3, max: (4000 * 13) / 1e3 };

    isRunningInitially = true;

    constructor(device) {
        super();

        this.capabilities.maxContinuousSamplingTimeUs = 130;
        this.serialNumber = parseInt(device.serialNumber, 10);
        this.isRttOpen = false;

        this.timestamp = 0;
        this.dataPayload = [];

        this.byteHandlerFn = this.byteHandlerReceiveMode;
    }

    byteHandlerReceiveMode(byte) {
        /* ESC received means that a valid data byte was either
         * ETX or ESC. Two bytes are sent, ESC and then valid ^ 0x20
         */
        switch (byte) {
            case ESC:
                // Don't do anything here, but wait for next byte and XOR it
                this.byteHandlerFn = this.byteHandlerEscapeMode;
                // End of transmission, send to average or trigger handling
                return;
            case ETX: {
                if (this.dataPayload.length === 4) {
                    this.handleAverageDataSet();
                    this.timestamp +=
                        this.adcSamplingTimeUs * SAMPLES_PER_AVERAGE;
                } else if (this.dataPayload.length === 5) {
                    this.timestamp = this.convertSysTick2MicroSeconds(
                        this.dataPayload.slice(0, 4)
                    );
                } else {
                    try {
                        this.handleTriggerDataSet();
                    } catch (error) {
                        this.emit(
                            'error',
                            'Corrupt data detected, please check connection to PPK.',
                            error
                        );
                    }
                }
                this.dataPayload = [];
                this.byteHandlerFn = this.byteHandlerReceiveMode;

                return;
            }
            default:
                // Input the value at the end of result array
                this.dataPayload.push(byte);
        }
    }

    byteHandlerEscapeMode(byte) {
        // XOR the byte after the ESC-character
        // Remove these two bytes, the ESC and the valid one

        const modbyte = byte ^ 0x20;
        this.dataPayload.push(modbyte);
        this.byteHandlerFn = this.byteHandlerReceiveMode;
    }

    parseMeasurementData(rawbytes) {
        rawbytes.forEach(byte => this.byteHandlerFn(byte));
    }

    convertSysTick2MicroSeconds(data) {
        this.sysTickViewUint8.set(data);
        return this.sysTickView.getUint32(data, true) * this.adcSamplingTimeUs;
    }

    logProbeInfo() {
        return new Promise(resolve => {
            nRFjprogjs.getProbeInfo(this.serialNumber, (err, info) => {
                logger.info('SEGGER serial number: ', info.serialNumber);
                logger.info('SEGGER speed: ', info.clockSpeedkHz, ' kHz');
                logger.info('SEGGER version: ', info.firmwareString);
                resolve();
            });
        });
    }

    startRTT() {
        return promiseTimeout(
            WAIT_FOR_START,
            new Promise((resolve, reject) => {
                nRFjprogjs.rttStart(this.serialNumber, {}, err =>
                    err ? reject(err) : resolve()
                );
            })
        );
    }

    static readRTT(serialNumber, length) {
        return new Promise((resolve, reject) => {
            nRFjprogjs.rttRead(
                serialNumber,
                0,
                length,
                (err, string, rawbytes, time) => {
                    if (err) {
                        return reject(new Error(err));
                    }
                    return resolve({ string, rawbytes, time });
                }
            );
        });
    }

    async readloop() {
        if (!this.isRttOpen) return;
        try {
            const { rawbytes } = await RTTDevice.readRTT(
                this.serialNumber,
                MAX_RTT_READ_LENGTH
            );
            if (rawbytes && rawbytes.length) {
                process.nextTick(
                    this.parseMeasurementData.bind(this, rawbytes)
                );
            }
            if (
                this.averageRunning ||
                this.triggerRunning ||
                this.triggerWaiting
            ) {
                process.nextTick(this.readloop.bind(this));
            } else {
                this.readloopRunning = false;
            }
        } catch (err) {
            this.isRttOpen = false;
            throw new Error('PPK connection failure');
        }
    }

    static getHardwareStates(serialNumber) {
        let iteration = 0;
        async function readUntil() {
            let hwStates;
            while (!hwStates && iteration < 250) {
                iteration += 1;
                // eslint-disable-next-line
                hwStates = await new Promise((resolve, reject) => {
                    nRFjprogjs.rttRead(
                        serialNumber,
                        0,
                        255,
                        (err, string, rawbytes, time) => {
                            if (err) {
                                return reject(new Error(err));
                            }
                            if (rawbytes.length) {
                                return resolve({
                                    string,
                                    rawbytes,
                                    time,
                                    iteration,
                                });
                            }
                            return resolve();
                        }
                    );
                });
            }
            return hwStates || { iteration };
        }
        return promiseTimeout(WAIT_FOR_HW_STATES, readUntil());
    }

    start() {
        logger.info('Initializing the PPK');
        return this.logProbeInfo()
            .then(() => this.startRTT())
            .then(() => {
                this.isRttOpen = true;
            })
            .then(() => RTTDevice.getHardwareStates(this.serialNumber))
            .then(({ string, iteration }) => {
                console.log(`it took ${iteration} iteration to read hw states`);
                if (!string) {
                    throw new Error('Couldn`t read hardware states.');
                }
                return string;
            });
    }

    startReadLoop() {
        if (!this.readloopRunning) {
            this.readloopRunning = true;
            process.nextTick(this.readloop.bind(this));
        }
    }

    stop() {
        if (!this.isRttOpen) {
            return Promise.resolve();
        }
        this.isRttOpen = false;
        return new Promise(resolve => {
            nRFjprogjs.rttStop(this.serialNumber, err => {
                if (err) {
                    this.emit(
                        'error',
                        'PPK connection failure',
                        'Failed to stop RTT'
                    );
                }
                resolve();
            });
        });
    }

    write(slipPackage) {
        return new Promise(resolve => {
            nRFjprogjs.rttWrite(
                this.serialNumber,
                0,
                slipPackage,
                (err, writtenLength) => {
                    if (err) {
                        this.emit('error', 'PPK command failed');
                        return resolve();
                    }
                    return resolve(writtenLength);
                }
            );
        });
    }

    async sendCommand(cmd) {
        const slipPackage = [];
        if (cmd.constructor !== Array) {
            this.emit(
                'error',
                'Unable to issue command',
                'Command is not an array'
            );
            return undefined;
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

        return this.write(slipPackage);
    }

    getAdcResult = {
        [MEAS_RANGE_LO]: adcVal => adcVal * (this.adcMult / this.resistors.lo),
        [MEAS_RANGE_MID]: adcVal =>
            adcVal * (this.adcMult / this.resistors.mid),
        [MEAS_RANGE_HI]: adcVal => adcVal * (this.adcMult / this.resistors.hi),
        [MEAS_RANGE_NONE]: () => {
            throw new Error('Measurement range not detected');
        },
        [MEAS_RANGE_INVALID]: () => {
            throw new Error('Invalid range');
        },
    };

    handleAverageDataSet() {
        try {
            this.serialUint8View.set(this.dataPayload);
        } catch (err) {
            this.emit('error', 'Average data error, restart application', err);
        }
        try {
            const value = this.viewFloat[0];
            let { timestamp } = this;
            for (let i = 0; i < SAMPLES_PER_AVERAGE; i += 1) {
                this.onSampleCallback({ value, timestamp });
                timestamp += this.adcSamplingTimeUs;
            }
        } catch (err) {
            this.emit('error', 'Average data error, restart application', err);
        }
    }

    handleTriggerDataSet() {
        this.triggerWaiting = false;
        if (this.triggerBuf.length !== this.dataPayload.length) {
            this.triggerBuf = new ArrayBuffer(this.dataPayload.length);
            this.viewUint8 = new Uint8Array(this.triggerBuf);
        }

        let { timestamp } = this;

        this.viewUint8.set(this.dataPayload);
        const view = new DataView(this.triggerBuf);
        for (let i = 0; i < this.dataPayload.length - 1; i += 2) {
            const adcValue = view.getUint16(i, true);

            const currentMeasurementRange = Math.min(
                (adcValue & MEAS_RANGE_MSK) >> MEAS_RANGE_POS,
                MEAS_RANGE_INVALID
            );

            const adcResult = adcValue & MEAS_ADC_MSK;
            const value =
                this.getAdcResult[currentMeasurementRange](adcResult) * 1e6;

            this.onSampleCallback({ value, timestamp });
            timestamp += this.adcSamplingTimeUs;
        }
    }

    parseMeta(hardwareStates) {
        const match = MetadataParser.exec(hardwareStates);
        if (!match) {
            this.emit('error', 'Failed to read PPK metadata');
            return undefined;
        }

        const [
            ,
            version,
            calibrationStatus,
            resLo,
            resMid,
            resHi,
            boardID,
            userResLo,
            userResMid,
            userResHi,
            vdd,
            vrefHigh,
            vrefLow,
        ] = match;

        return {
            version,
            calibrationStatus,
            boardID,
            resLo: resLo ? parseFloat(resLo) : undefined,
            resMid: resMid ? parseFloat(resMid) : undefined,
            resHi: resHi ? parseFloat(resHi) : undefined,
            userResLo: userResLo ? parseFloat(userResLo) : undefined,
            userResMid: userResMid ? parseFloat(userResMid) : undefined,
            userResHi: userResHi ? parseFloat(userResHi) : undefined,
            vdd: vdd ? parseInt(vdd, 10) : undefined,
            vrefHigh: vrefHigh ? parseInt(vrefHigh, 10) : undefined,
            vrefLow: vrefLow ? parseInt(vrefLow, 10) : undefined,
        };
    }

    // Capability methods

    ppkAverageStart() {
        this.averageRunning = true;
        this.startReadLoop();
        return super.ppkAverageStart();
    }

    ppkAverageStop() {
        this.averageRunning = false;
        return super.ppkAverageStop();
    }

    ppkTriggerStop() {
        this.triggerRunning = false;
        return this.sendCommand([PPKCmd.TriggerStop]);
    }

    ppkTriggerSet(triggerLevel) {
        this.triggerRunning = true;
        this.startReadLoop();
        return this.sendCommand([
            PPKCmd.TriggerSet,
            ...triggerLevelConv(triggerLevel),
        ]);
    }

    ppkTriggerSingleSet(triggerLevel) {
        this.triggerWaiting = true;
        this.startReadLoop();
        return this.sendCommand([
            PPKCmd.TriggerSingleSet,
            ...triggerLevelConv(triggerLevel),
        ]);
    }

    ppkTriggerExtToggle() {
        return this.sendCommand([PPKCmd.TriggerExtToggle]);
    }

    ppkTriggerWindowSet(value) {
        const wnd = Math.floor((value * 1000) / this.adcSamplingTimeUs);
        return this.sendCommand([
            PPKCmd.TriggerWindowSet,
            wnd >> 8,
            wnd & 0xff,
        ]);
    }

    ppkSwitchPointUp(vref) {
        return this.sendCommand([PPKCmd.SwitchPointUp, vref >> 8, vref & 0xff]);
    }

    ppkSwitchPointDown(vref) {
        return this.sendCommand([
            PPKCmd.SwitchPointDown,
            vref >> 8,
            vref & 0xff,
        ]);
    }

    ppkUpdateResistors(low, mid, high) {
        const lowbytes = convertFloatToByteBuffer(low);
        const midbytes = convertFloatToByteBuffer(mid);
        const highbytes = convertFloatToByteBuffer(high);
        this.resistors.hi = high;
        this.resistors.mid = mid;
        this.resistors.lo = low;
        return this.sendCommand([
            PPKCmd.ResUserSet,
            ...lowbytes,
            ...midbytes,
            ...highbytes,
        ]);
    }

    ppkSpikeFilteringOn() {
        return this.sendCommand([PPKCmd.SpikeFilteringOn]);
    }

    ppkSpikeFilteringOff() {
        return this.sendCommand([PPKCmd.SpikeFilteringOff]);
    }
}

export default RTTDevice;
