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

import nRFjprogjs from 'pc-nrfjprog-js';
import { logger } from 'nrfconnect/core';

import {
    MAX_RTT_READ_LENGTH,
    WAIT_FOR_START,
    WAIT_FOR_HW_STATES,
} from '../constants';

const { RTT } = nRFjprogjs;

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

class RTTDevice {
    constructor(device, emitter, parseMeasurementData) {
        this.emit = emitter.emit.bind(emitter);
        this.serialNumber = parseInt(device.serialNumber, 10);
        this.parseMeasurementData = parseMeasurementData;
        this.isRttOpen = false;
    }

    logProbeInfo() {
        return new Promise(resolve => {
            nRFjprogjs.getProbeInfo(this.serialNumber, (err, info) => {
                logger.info('SEGGER serial: ', info.serialNumber);
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
                RTT.start(this.serialNumber, {}, err => (err ? reject(err) : resolve()));
            }),
        );
    }

    static readRTT(length) {
        return new Promise((resolve, reject) => {
            RTT.read(0, length, (err, string, rawbytes, time) => {
                if (err) {
                    return reject(new Error(err));
                }
                return resolve({ string, rawbytes, time });
            });
        });
    }

    async readloop() {
        if (!this.isRttOpen) return;
        try {
            const { rawbytes } = await RTTDevice.readRTT(MAX_RTT_READ_LENGTH);
            if (rawbytes && rawbytes.length) {
                process.nextTick(this.parseMeasurementData.bind(null, rawbytes));
            }
            process.nextTick(this.readloop.bind(this));
        } catch (err) {
            this.isRttOpen = false;
            throw new Error('PPK connection failure');
        }
    }

    static getHardwareStates() {
        let iteration = 0;
        async function readUntil() {
            let hwStates;
            while (!hwStates && iteration < 250) {
                iteration += 1;
                // eslint-disable-next-line
                hwStates = await new Promise((resolve, reject) => {
                    RTT.read(0, 255, (err, string, rawbytes, time) => {
                        if (err) {
                            return reject(new Error(err));
                        }
                        if (rawbytes.length) {
                            return resolve({
                                string, rawbytes, time, iteration,
                            });
                        }
                        return resolve();
                    });
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
            .then(() => RTTDevice.getHardwareStates())
            .then(({ string, iteration }) => {
                console.log(`it took ${iteration} iteration to read hw states`);
                if (!string) {
                    throw new Error('Couldn`t read hardware states.');
                }
                process.nextTick(this.readloop.bind(this));
                return string;
            });
    }

    stop() {
        if (!this.isRttOpen) {
            return Promise.resolve();
        }
        this.isRttOpen = false;
        return new Promise(resolve => {
            RTT.stop(err => {
                if (err) {
                    this.emit('error', 'PPK connection failure', 'Failed to stop RTT');
                }
                resolve();
            });
        });
    }

    write(slipPackage) {
        return new Promise(resolve => {
            RTT.write(0, slipPackage, (err, writtenLength) => {
                if (err) {
                    this.emit('error', 'PPK command failed');
                    return resolve();
                }
                return resolve(writtenLength);
            });
        });
    }
}

export default RTTDevice;
