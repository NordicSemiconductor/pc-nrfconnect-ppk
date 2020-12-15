/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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
import { indexToTimestamp } from '../globals';
import { chartWindowAction } from '../reducers/chartReducer';
import {
    clearSingleTriggerWaitingAction,
    setTriggerStartAction,
} from '../reducers/triggerReducer';

export function processTriggerSample(currentValue, device, samplingData) {
    return (dispatch, getState) => {
        const {
            samplingTime,
            dataIndex: currentIndex,
            dataBuffer,
        } = samplingData;
        const {
            trigger: {
                triggerLength,
                triggerLevel,
                triggerSingleWaiting,
                triggerStartIndex,
                triggerWindowOffset,
            },
        } = getState().app;

        if (!triggerStartIndex) {
            if (currentValue >= triggerLevel) {
                dispatch(setTriggerStartAction(currentIndex));
            }
            return;
        }

        const windowSize = calculateWindowSize(triggerLength, samplingTime);

        const enoughSamplesCollected =
            (triggerStartIndex + windowSize) % dataBuffer.length <=
            currentIndex;

        if (!enoughSamplesCollected) return;
        if (triggerSingleWaiting) {
            logger.info('Trigger received, stopped waiting');
            dispatch(clearSingleTriggerWaitingAction());
            device.ppkTriggerStop();
        }

        const shiftedIndex = getShiftedIndex(
            windowSize,
            samplingTime,
            triggerWindowOffset,
            device.capabilities.prePostTriggering
        );

        const from = indexToTimestamp(triggerStartIndex - shiftedIndex);
        const to = indexToTimestamp(currentIndex - shiftedIndex);
        dispatch(chartWindowAction(from, to, to - from));
        dispatch(setTriggerStartAction(null));
    };
}

// PPK2 trigger point should by default be shifted to middle of window
function getShiftedIndex(
    windowSize,
    samplingTime,
    triggerOffset = 0,
    supportsPrePostTriggering = false
) {
    if (!supportsPrePostTriggering) return 0;
    const offsetToSamples = Math.ceil(triggerOffset / samplingTime);
    return windowSize / 2 + offsetToSamples;
}

export const calculateWindowSize = (triggerLength, samplingTime) =>
    Math.floor((triggerLength * 1000) / samplingTime);
