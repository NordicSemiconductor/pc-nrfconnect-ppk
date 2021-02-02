/* Copyright (c) 2015 - 2021, Nordic Semiconductor ASA
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

import isDev from 'electron-is-dev';
import { logger } from 'pc-nrfconnect-shared';
import { options, device } from '../globals';
import { convertBits16 } from '../utils/bitConversion';
import { processTriggerSample } from './triggerActions';
import { resetCursorAndChart } from '../reducers/chartReducer';
import {
    samplingStartAction,
    samplingStoppedAction,
} from '../reducers/appReducer';

const zeroCap = isDev ? n => n : n => Math.max(0, n);

const onSample = (dispatch, getState) => {
    let prevValue = 0;
    let prevBits = 0;
    let nbSamples = 0;
    let nbSamplesTotal = 0;

    return ({ value, bits, endOfTrigger }) => {
        if (options.timestamp === undefined) {
            options.timestamp = 0;
        }

        const {
            app: { samplingRunning },
            dataLogger: { maxSampleFreq, sampleFreq },
            trigger: {
                triggerRunning,
                triggerStartIndex,
                triggerSingleWaiting,
            },
        } = getState().app;
        if (
            !triggerRunning &&
            !samplingRunning &&
            !triggerStartIndex &&
            !triggerSingleWaiting
        ) {
            return;
        }

        let zeroCappedValue = zeroCap(value);
        const b16 = convertBits16(bits);

        if (samplingRunning && sampleFreq < maxSampleFreq) {
            const samplesPerAverage = maxSampleFreq / sampleFreq;
            nbSamples += 1;
            nbSamplesTotal += 1;
            const f = Math.min(nbSamplesTotal, samplesPerAverage);
            if (prevValue !== undefined && value !== undefined) {
                zeroCappedValue = prevValue + (zeroCappedValue - prevValue) / f;
            }
            if (nbSamples < samplesPerAverage) {
                if (value !== undefined) {
                    prevValue = zeroCappedValue;
                    prevBits |= b16;
                }
                return;
            }
            nbSamples = 0;
        }

        options.data[options.index] = zeroCappedValue;
        if (options.bits) {
            options.bits[options.index] = b16 | prevBits;
            prevBits = 0;
        }
        options.index += 1;
        options.timestamp += options.samplingTime;

        if (options.index === options.data.length) {
            if (samplingRunning) {
                dispatch(samplingStop());
            }
            options.index = 0;
        }
        if (triggerRunning || triggerSingleWaiting) {
            dispatch(
                processTriggerSample(value, {
                    samplingTime: options.samplingTime,
                    dataIndex: options.index,
                    dataBuffer: options.data,
                    endOfTrigger,
                })
            );
        }
    };
};

/* Start reading current measurements */
function samplingStart() {
    return async dispatch => {
        options.data.fill(NaN);
        if (options.bits) {
            options.bits.fill(0);
        }
        options.index = 0;
        options.timestamp = undefined;
        dispatch(resetCursorAndChart());
        dispatch(samplingStartAction());
        await device.ppkAverageStart();
        logger.info('Sampling started');
    };
}

function samplingStop() {
    return async dispatch => {
        if (!device) return;
        dispatch(samplingStoppedAction());
        await device.ppkAverageStop();
        logger.info('Sampling stopped');
    };
}

export { onSample, samplingStart, samplingStop };
