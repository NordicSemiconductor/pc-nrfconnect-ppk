/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    logger,
    NumberInputSliderWithUnit,
    StateSelector,
    telemetry,
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

type CurrentUnit = 'mA' | '\u00B5A';
const getMin = (unit: CurrentUnit) => {
    switch (unit) {
        case 'mA':
            return 1;
        case '\u00B5A':
            return 0.2;
    }
};

const convertToMicroAmps = (unit: CurrentUnit, value: number) => {
    switch (unit) {
        case 'mA':
            return value * 1000;
        case '\u00B5A':
            return value;
    }
};

export default () => {
    const dispatch = useDispatch();
    const recordingLength = useSelector(getTriggerRecordingLength);
    const triggerValue = useSelector(getTriggerValue);
    const triggerType = useSelector(getTriggerType);
    const triggerSaveQueueLength = useSelector(getSavingEventQueueLength);
    const autoExportTrigger = useSelector(getAutoExportTrigger);

    const [levelUnit, setLevelUnit] = useState<CurrentUnit>('µA');

    useEffect(() => {
        if (triggerSaveQueueLength >= 10 && autoExportTrigger) {
            dispatch(setAutoExportTrigger(false));
            telemetry.sendEvent('Auto Export', {
                state: false,
                reason: 'excessive number of triggers',
            });
            logger.warn(
                'Unable to keep up with saving triggers. Auto export was turned off due to excessive number of triggers'
            );
        }
    }, [autoExportTrigger, dispatch, triggerSaveQueueLength]);

    const { samplingRunning } = useSelector(appState);

    const [internalTriggerValue, setInternalTriggerValue] =
        useState(triggerValue);
    const [internalTriggerLength, setInternalTriggerLength] =
        useState(recordingLength);

    useEffect(() => {
        if (triggerValue > 1000) {
            setLevelUnit('mA');
            setInternalTriggerValue(Number((triggerValue / 1000).toFixed(4)));
        } else {
            setLevelUnit('µA');
            setInternalTriggerValue(Number(triggerValue.toFixed(3)));
        }
    }, [triggerValue]);

    useEffect(() => {
        setInternalTriggerLength(recordingLength);
    }, [recordingLength]);

    return (
        <>
            <NumberInputSliderWithUnit
                range={{
                    min: 1,
                    max: 1000,
                    decimals: 2,
                    step: 0.01,
                }}
                value={internalTriggerLength}
                onChange={setInternalTriggerLength}
                onChangeComplete={(value: number) => {
                    dispatch(setTriggerRecordingLength(value));
                }}
                unit="ms"
                label="Length"
            />
            <NumberInputSliderWithUnit
                range={{
                    min: getMin(levelUnit),
                    max: levelUnit === 'µA' ? 2000 : 1000,
                    decimals: levelUnit === 'µA' ? 3 : 4,
                    step: 0.001,
                }}
                value={internalTriggerValue}
                onChange={v => setInternalTriggerValue(v)}
                onChangeComplete={(value: number) => {
                    dispatch(
                        setTriggerLevel(convertToMicroAmps(levelUnit, value))
                    );
                }}
                unit={levelUnit}
                label="Level"
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
