/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger } from 'pc-nrfconnect-shared';

import { indexToTimestamp } from '../globals';
import { chartTriggerWindowAction } from '../slices/chartSlice';
import {
    clearSingleTriggerWaitingAction,
    completeTriggerAction,
    setTriggerStartAction,
} from '../slices/triggerSlice';

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

export function processTriggerSample(currentValue, device, samplingData) {
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
                dispatch(
                    setTriggerStartAction({ triggerStartIndex: currentIndex })
                );
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
            ? dispatch(setTriggerStartAction({ triggerStartIndex: null }))
            : dispatch(completeTriggerAction({ triggerStartIndex }));
    };
}
