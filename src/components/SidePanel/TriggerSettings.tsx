/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    logger,
    NumberInputSliderWithUnit,
    StateSelector,
    telemetry,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import {
    getAutoExportTrigger,
    getSavingEventQueueLength,
    getTriggerRecordingLength,
    getTriggerType,
    getTriggerValue,
    setAutoExportTrigger,
    setTriggerLevel,
    setTriggerRecordingLength,
    setTriggerType,
    TriggerTypeValues,
} from '../../slices/triggerSlice';

const useSynchronizationIfChangedFromOutside = <T,>(
    externalValue: T,
    setInternalValue: (value: T) => void
) => {
    const previousExternalValue = useRef(externalValue);
    useEffect(() => {
        if (previousExternalValue.current !== externalValue) {
            setInternalValue(externalValue);
            previousExternalValue.current = externalValue;
        }
    });
    return previousExternalValue.current;
};

export default () => {
    const dispatch = useDispatch();
    const recordingLength = useSelector(getTriggerRecordingLength);
    const triggerValue = useSelector(getTriggerValue);
    const triggerType = useSelector(getTriggerType);
    const autoExport = useSelector(getAutoExportTrigger);
    const triggerSaveQueueLength = useSelector(getSavingEventQueueLength);
    const autoExportTrigger = useSelector(getAutoExportTrigger);

    useEffect(() => {
        if (triggerSaveQueueLength >= 10 && autoExportTrigger) {
            dispatch(setAutoExportTrigger(false));
            telemetry.sendEvent('Auto Export', {
                state: false,
                reason: 'excessive number of triggers',
            });
            logger.warn(
                'Unable to keep up with saving triggers. Auto export was turn off due to excessive number of triggers'
            );
        }
    }, [autoExportTrigger, dispatch, triggerSaveQueueLength]);

    const { samplingRunning } = useSelector(appState);

    const [internalTriggerValue, setInternalTriggerValue] =
        useState(triggerValue);

    useSynchronizationIfChangedFromOutside(
        triggerValue,
        setInternalTriggerValue
    );

    return (
        <>
            <NumberInputSliderWithUnit
                range={{
                    min: 1,
                    max: 10000,
                    decimals: 2,
                    step: 0.01,
                }}
                value={recordingLength}
                onChange={(value: number) => {
                    dispatch(setTriggerRecordingLength(value));
                }}
                unit="ms"
                label="Length"
            />
            <NumberInputSliderWithUnit
                range={{
                    min: 0.4,
                    max: 1000000,
                    decimals: 3,
                    step: 0.001,
                }}
                value={internalTriggerValue}
                onChange={v => setInternalTriggerValue(v)}
                onChangeComplete={(value: number) => {
                    dispatch(setTriggerLevel(value));
                }}
                unit="uA"
                label="Level"
            />
            <Toggle
                isToggled={autoExport}
                label="Auto export"
                disabled={samplingRunning}
                onToggle={v => {
                    telemetry.sendEvent('Auto Export', {
                        state: v,
                        reason: 'user interaction',
                    });
                    dispatch(setAutoExportTrigger(v));
                }}
            />
            <StateSelector
                items={[...TriggerTypeValues]}
                onSelect={m => dispatch(setTriggerType(TriggerTypeValues[m]))}
                selectedItem={triggerType}
                disabled={samplingRunning}
            />
        </>
    );
};
