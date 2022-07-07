/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO: Remove, only added for conservative refactoring to typescript */

import { logger } from 'pc-nrfconnect-shared';

import { SupportedDevice } from '../device/types';
import { indexToTimestamp } from '../globals';
import { RootState } from '../slices';
import { chartTriggerWindowAction } from '../slices/chartSlice';
import { TDispatch } from '../slices/thunk';
import {
    clearSingleTriggerWaitingAction,
    completeTriggerAction,
    setTriggerStartAction,
} from '../slices/triggerSlice';

// PPK2 trigger point should by default be shifted to middle of window
const getShiftedIndex = (
    windowSize: number,
    samplingTime: number,
    triggerOffset = 0,
    supportsPrePostTriggering = false
): number => {
    if (!supportsPrePostTriggering) return 0;
    const offsetToSamples = Math.ceil(triggerOffset / samplingTime);
    return windowSize / 2 + offsetToSamples;
};

export const calculateWindowSize = (
    triggerLength: number,
    samplingTime: number
): number => Math.floor((triggerLength * 1000) / samplingTime);

export function processTriggerSample(
    currentValue: number,
    device: SupportedDevice,
    samplingData: {
        samplingTime: number;
        dataIndex: number;
        dataBuffer: Float32Array;
        endOfTrigger: number;
    }
) {
    return (dispatch: TDispatch, getState: () => RootState) => {
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
            if (currentValue >= triggerLevel! || isPPK1) {
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
        dispatch(chartTriggerWindowAction(from!, to!, to! - from!));
        isPPK1
            ? dispatch(setTriggerStartAction({ triggerStartIndex: null }))
            : dispatch(completeTriggerAction({ origin: triggerStartIndex }));
    };
}
