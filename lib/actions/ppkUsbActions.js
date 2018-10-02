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

import SerialPort from 'serialport';
import { logger } from 'nrfconnect/core';

import {
    // ADC_SAMPLING_TIME_US,
    // AVERAGE_TIME_US,
    TRIGGER_SAMPLES_PER_SECOND,
    AVERAGE_SAMPLES_PER_SECOND,
    // BUFFER_LENGTH_IN_SECONDS,
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


export function open(serialNumberString) {
    console.log(serialNumberString);
    const port = new SerialPort('/dev/ttyACM2', { autoOpen: false });
    port.open(err => {
        console.log(err);
    });

    port.on('data', data => {
        data.forEach(byte => {
            console.log(byte);
            // byteHandlerFunc(byte);
        });
    });
    return async (dispatch, getState) => {
        dispatch(ppkOpenedAction(serialNumberString));
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
