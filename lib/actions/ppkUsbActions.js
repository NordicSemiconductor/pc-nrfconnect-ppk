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

import { logger } from 'nrfconnect/core';
import * as Serial from './serial';

import {
    // ADC_SAMPLING_TIME_US,
    AVERAGE_TIME_US,
    TRIGGER_SAMPLES_PER_SECOND,
    AVERAGE_SAMPLES_PER_SECOND,
    BUFFER_LENGTH_IN_SECONDS,
    AVERAGE_BUFFER_LENGTH,
    // PPKCmd,
} from '../constants';

export const averageOptions = {
    data: new Array(Math.trunc(AVERAGE_BUFFER_LENGTH)),
    index: 0,
    timestamp: 0,
    samplesPerSecond: AVERAGE_SAMPLES_PER_SECOND,
    color: 'rgba(179, 40, 96, 1)',
    valueRange: {
        min: -100,
        max: 15000,
    },
};

export const triggerOptions = {
    data: [],
    index: 0,
    timestamp: 0,
    samplesPerSecond: TRIGGER_SAMPLES_PER_SECOND,
    color: 'rgba(79, 140, 196, 1)',
    valueRange: {
        min: -100,
        max: 15000,
    },
};


export const PPK_OPENED = 'PPK_OPENED';
export const PPK_ANIMATION = 'PPK_ANIMATION';
export const AVERAGE_STOPPED = 'AVERAGE_STOPPED';

function ppkOpenedAction(portName) {
    return {
        type: PPK_OPENED,
        portName,
    };
}

function ppkAnimationAction() {
    return {
        type: PPK_ANIMATION,
        averageIndex: averageOptions.index,
        triggerIndex: triggerOptions.index,
    };
}

function ppkAverageStoppedAction() {
    return {
        type: AVERAGE_STOPPED,
    };
}

export function averageStop() {
    return async dispatch => {
        dispatch(ppkAverageStoppedAction());
        // await RTT.PPKCommandSend([PPKCmd.AverageStop]);
        logger.info('Average stopped');
    };
}

export function open(device) {
    return async (dispatch, getState) => {
        console.log(getState());
        dispatch(ppkOpenedAction(device));
        logger.info('PPK opened');

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

        Serial.events.on('average', (value, timestamp) => {
            console.log('Event average');
            console.log(value);
            console.log(timestamp);
            const { averageRunning, windowBegin, windowEnd } = getState().app.average;
            if (!averageRunning) {
                // skip incoming data after stopped
                return;
            }
            if ((windowBegin !== 0 || windowEnd !== 0)
                && timestamp >= windowBegin + (BUFFER_LENGTH_IN_SECONDS * 1e6)) {
                // stop average when reaches end of buffer (i.e. would overwrite chart data)
                dispatch(averageStop());
                return;
            }

            let avgts = averageOptions.timestamp;
            while (avgts < timestamp - AVERAGE_TIME_US) {
                avgts = avgts + AVERAGE_TIME_US;
                averageOptions.data[averageOptions.index] = undefined;
                averageOptions.index = averageOptions.index + 1;
                if (averageOptions.index === averageOptions.data.length) {
                    averageOptions.index = 0;
                }
            }
            averageOptions.data[averageOptions.index] = value;
            averageOptions.index = averageOptions.index + 1;
            averageOptions.timestamp = timestamp;
            if (averageOptions.index === averageOptions.data.length) {
                averageOptions.index = 0;
            }
            updateChart();
        });
        Serial.events.on('trigger', () => {
            console.log('Event trigger');
        });
        Serial.events.on('error', () => {
            console.log('Event error');
        });

        Serial.start(device.serialport.comName);
        // Serial.read();
    };
}

export function close() {
    return async () => {
        // await RTT.stop();
        // RTT.events.removeAllListeners();
        // dispatch(ppkClosedAction());
        logger.info('PPK closed');
    };
}
