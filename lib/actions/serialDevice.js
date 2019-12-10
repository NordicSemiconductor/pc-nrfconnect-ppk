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

import SerialPort from 'serialport';

class SerialDevice {
    constructor(device, emitter, parseMeasurementData) {
        this.emit = emitter.emit.bind(emitter);
        this.comName = device.serialport.comName;
        this.parseMeasurementData = parseMeasurementData;
        this.port = null;
    }

    start() {
        return new Promise((resolve, reject) => {
            this.port = new SerialPort(this.comName, { autoOpen: false });
            console.log(this.port);
            this.port.open(err => {
                if (err) {
                    return reject(err);
                }

                this.port.on('data', this.parseMeasurementData);

                this.port.on('error', console.log);
                this.port.on('close', console.log);
                this.port.on('drain', console.log);

                // read hardware states here
                const metadataString = [
                    'VERSION 0.0.0 CAL: 1 ',
                    'R1: 512 R2: 28 R3: 1.8 Board ID ABCDEF ',
                    'Refs VDD: 3000 HI: 5 LO: 6',
                ].join('');
                return resolve(metadataString);
            });
        });
    }

    stop() {
        return new Promise(resolve => {
            if (!this.port || !this.port.isOpen) {
                resolve();
            }
            this.port.close(err => {
                if (err) {
                    this.emit('error', 'PPK connection failure', 'Failed to stop Serial');
                }
                resolve();
            });
        });
    }

    write(slipPackage) {
        return new Promise(resolve => {
            this.port.write(slipPackage, (err, writtenLength) => {
                if (err) {
                    this.emit('error', 'PPK command failed');
                    return resolve();
                }
                return resolve(writtenLength);
            });
        });
    }
}

export default SerialDevice;
