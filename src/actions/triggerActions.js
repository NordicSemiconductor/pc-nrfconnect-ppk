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

import { logger } from 'pc-nrfconnect-shared';

import { device, indexToTimestamp } from '../globals';
import {
    chartTriggerWindowAction,
    resetCursorAndChart,
} from '../reducers/chartReducer';
import {
    clearSingleTriggerWaitingAction,
    completeTriggerAction,
    externalTriggerToggledAction,
    setTriggerStartAction,
    toggleTriggerAction,
    triggerLengthSetAction,
    triggerLevelSetAction,
    triggerSingleSetAction,
    triggerWindowRangeAction,
} from '../reducers/triggerReducer';

// PPK2 trigger point should by default be shifted to middle of window
const getShiftedIndex = (
    windowSize,
    samplingTime,
    triggerOffset = 0,
    supportsPrePostTriggering = false
) => {
    if (!supportsPrePostTriggering) return 0;
    const offsetToSamples = Math.ceil(triggerOffset / samplingTime);
    return windowSize / 2 + offsetToSamples;
};

export const calculateWindowSize = (triggerLength, samplingTime) =>
    Math.floor((triggerLength * 1000) / samplingTime);

export function processTriggerSample(currentValue, samplingData) {
    return (dispatch, getState) => {
        const {
            samplingTime,
            dataIndex: currentIndex,
            dataBuffer,
            endOfTrigger, // boolean for PPK1 and undefined for PPK2
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

        const isPPK1 = !!device.capabilities.hwTrigger;

        if (!triggerStartIndex) {
            if (currentValue >= triggerLevel || isPPK1) {
                dispatch(setTriggerStartAction(currentIndex));
            }
            return;
        }

        const windowSize = calculateWindowSize(triggerLength, samplingTime);

        const enoughSamplesCollected = isPPK1
            ? endOfTrigger
            : (triggerStartIndex + windowSize) % dataBuffer.length <=
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
        dispatch(chartTriggerWindowAction(from, to, to - from));
        isPPK1
            ? dispatch(setTriggerStartAction(null))
            : dispatch(completeTriggerAction(triggerStartIndex));
    };
}

export function triggerStop() {
    return async dispatch => {
        if (!device) return;
        logger.info('Stopping trigger');
        await device.ppkTriggerStop();
        dispatch(toggleTriggerAction(false));
        dispatch(clearSingleTriggerWaitingAction());
    };
}

/**
 * Takes the window value in milliseconds, adjusts for microsecs
 * and resolves the number of bytes we need for this size of window.
 * @param {number} value  Value received in milliseconds
 * @returns {null} Nothing
 */
export function triggerLengthUpdate(value) {
    return async dispatch => {
        dispatch(triggerLengthSetAction(value));
        // If division returns a decimal, round downward to nearest integer
        if (device.capabilities.ppkTriggerWindowSet) {
            await device.ppkTriggerWindowSet(value);
        }
        logger.info(`Trigger length updated to ${value} ms`);
    };
}

export function triggerStart() {
    return async (dispatch, getState) => {
        dispatch(resetCursorAndChart());
        dispatch(toggleTriggerAction(true));
        dispatch(clearSingleTriggerWaitingAction());

        const { triggerLevel } = getState().app.trigger;
        logger.info(`Starting trigger at ${triggerLevel} \u00B5A`);

        await device.ppkTriggerSet(triggerLevel);
    };
}

export function triggerSingleSet() {
    return async (dispatch, getState) => {
        dispatch(resetCursorAndChart());
        dispatch(triggerSingleSetAction());

        const { triggerLevel } = getState().app.trigger;
        logger.info(`Waiting for single trigger at ${triggerLevel} \u00B5A`);

        await device.ppkTriggerSingleSet(triggerLevel);
    };
}

export function externalTriggerToggled(chbState) {
    return async dispatch => {
        if (chbState) {
            await device.ppkTriggerStop();
            logger.info('Starting external trigger');
        } else {
            logger.info('Stopping external trigger');
        }
        await device.ppkTriggerExtToggle();
        dispatch(externalTriggerToggledAction());
    };
}

export function updateTriggerLevel(triggerLevel) {
    return async (dispatch, getState) => {
        dispatch(triggerLevelSetAction(triggerLevel));
        if (!device.capabilities.hwTrigger) return;

        const { triggerSingleWaiting, triggerRunning } = getState().app.trigger;

        if (triggerSingleWaiting) {
            logger.info(`Trigger level updated to ${triggerLevel} \u00B5A`);
            await device.ppkTriggerSingleSet(triggerLevel);
        } else if (triggerRunning) {
            logger.info(`Trigger level updated to ${triggerLevel} \u00B5A`);
            await device.ppkTriggerSet(triggerLevel);
        }
    };
}

export const initialiseTriggerSettings = () => async (dispatch, getState) => {
    const { triggerLength, triggerLevel, triggerWindowRange } =
        getState().app.trigger;
    if (!triggerLength) await dispatch(triggerLengthUpdate(10));
    if (!triggerLevel) dispatch(triggerLevelSetAction(1000));
    if (!triggerWindowRange)
        dispatch(triggerWindowRangeAction(device.triggerWindowRange));
};
