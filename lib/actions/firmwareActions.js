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

import { getAppDir } from 'nrfconnect/core';
import nrfjprog from 'pc-nrfjprog-js';

const DEVICE_FAMILY_NRF52 = 1;

const FIRMWARE_ID_ADDRESS = 0x10000;
const FIRMWARE_ID = 'ppk-fw-2.0.0';
const FIRMWARE_PATH = `${getAppDir()}/firmware/ppk_nrfconnect.hex`;

function read(serialNumber, address, length) {
    return new Promise((resolve, reject) => {
        nrfjprog.read(serialNumber, address, length, (err, contents) => {
            if (err) {
                reject(err);
            } else {
                resolve(contents);
            }
        });
    });
}

export function getDeviceInfo(serialNumber) {
    return new Promise((resolve, reject) => {
        nrfjprog.getDeviceInfo(serialNumber, (err, deviceInfo) => {
            if (err) {
                reject(err);
            } else {
                resolve(deviceInfo);
            }
        });
    });
}

function program(serialNumber, path) {
    return new Promise((resolve, reject) => {
        nrfjprog.program(serialNumber, path, {}, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

export function validateFirmware(serialNumber, { onValid, onInvalid }) {
    return dispatch => {
        read(serialNumber, FIRMWARE_ID_ADDRESS, FIRMWARE_ID.length)
            .then(contents => {
                const data = new Buffer(contents).toString();
                if (data === FIRMWARE_ID) {
                    onValid();
                } else {
                    onInvalid();
                }
            })
            .catch(err => {
                dispatch({ type: 'FIRMWARE_DIALOG_HIDE' });
                dispatch({
                    type: 'ERROR_DIALOG_SHOW',
                    message: `Error when validating firmware: ${err.message}`,
                });
            });
    };
}

export function programFirmware(serialNumber, { onSuccess }) {
    return dispatch => {
        getDeviceInfo(serialNumber)
            .then(deviceInfo => {
                if (deviceInfo.family !== DEVICE_FAMILY_NRF52) {
                    throw new Error(`${serialNumber} is not a valid PPK board`);
                }
                return program(serialNumber, FIRMWARE_PATH);
            })
            .then(onSuccess)
            .catch(err => {
                dispatch({ type: 'FIRMWARE_DIALOG_HIDE' });
                dispatch({
                    type: 'ERROR_DIALOG_SHOW',
                    message: `Error when programming: ${err.message}`,
                });
            });
    };
}
