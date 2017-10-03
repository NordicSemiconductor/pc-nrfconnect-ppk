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

import { logger } from 'nrfconnect/core';
import * as RTT from './rtt';

const SerialPort = require('serialport');

let port;

const TRIGGER_SAMPLES_PER_SECOND = 77000;
const AVERAGE_SAMPLES_PER_SECOND = 7700;
const BUFFER_LENGTH_IN_SECONDS = 600;

export const triggerOptions = {
    DataType: Uint16Array,
    data: new Uint16Array(TRIGGER_SAMPLES_PER_SECOND * BUFFER_LENGTH_IN_SECONDS).fill(0),
    index: 0,
    timestamp: new Date(0),
    samplesPerSecond: TRIGGER_SAMPLES_PER_SECOND,
    color: 'rgba(79, 140, 196, 1)',
    min: 0,
    max: 65535,
};

export const averageOptions = {
    DataType: Float32Array,
    data: new Float32Array(AVERAGE_SAMPLES_PER_SECOND * BUFFER_LENGTH_IN_SECONDS).fill(0),
    index: 0,
    timestamp: new Date(0),
    samplesPerSecond: AVERAGE_SAMPLES_PER_SECOND,
    color: 'rgba(179, 40, 96, 0.3)',
    min: -1,
    max: 15000,
};

function ppkOpenedAction(portName) {
    return {
        type: 'PPK_OPENED',
        portName,
    };
}

function ppkClosedAction() {
    return {
        type: 'PPK_CLOSED',
    };
}

function ppkMetadataAction(metadata) {
    return {
        type: 'PPK_METADATA',
        metadata,
    };
}

function ppkAnimationAction() {
    return {
        type: 'PPK_ANIMATION',
        averageIndex: averageOptions.index,
        triggerIndex: triggerOptions.index,
    };
}

export function open(serialPort) {
    return async dispatch => {
        port = new SerialPort(serialPort.comName, {
            baudRate: 1000000,
            rtscts: true,
        }, err => {
            if (err) {
                console.log('Unable to open COM port:');
                console.log(err.message);
                logger.info('Failed to open port, continuing...');
                dispatch(ppkClosedAction(port));
            } else {
                dispatch(ppkOpenedAction(port));
            }
        });
        // FIXME: If serial is failing to open, it should be handled in core?
        logger.info('PPK opened');

        // Give the RTT instance a reference to the serial port
        RTT.setPort(port);

        let throttleUpdates = false;

        const updateChart = () => {
            if (throttleUpdates) {
                return;
            }
            throttleUpdates = true;
            requestAnimationFrame(() => {
                throttleUpdates = false;
                dispatch(ppkAnimationAction());
            });
        };

        const insertValue = (options, value) => {
            const opts = options;
            opts.data[options.index] = value;
            opts.index += 1;
            opts.timestamp = new Date();
            if (opts.index === options.data.length) {
                opts.index = 0;
            }
            updateChart();
        };

        RTT.events.on('trigger', insertValue.bind(this, triggerOptions));
        RTT.events.on('average', insertValue.bind(this, averageOptions));

        const metadata = await RTT.read(0, 200);
        dispatch(ppkMetadataAction(metadata.split('\r\n')));
    };
}

export function close() {
    return dispatch => {
        RTT.stop();
        RTT.events.removeAllListeners();
        dispatch(ppkClosedAction());
        logger.info('PPK closed');
    };
}

export function startTrigger() {
    RTT.trigger();
}

export function startAverage() {
    RTT.average();
}
