/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NumberInput } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import { getRecordingMode } from '../../slices/chartSlice';
import {
    getTriggerOffset,
    getTriggerRecordingLength,
    setTriggerOffset,
    setTriggerRecordingLength,
} from '../../slices/triggerSlice';

export default () => {
    const dispatch = useDispatch();
    const recordingLength = useSelector(getTriggerRecordingLength);
    const triggerOffset = useSelector(getTriggerOffset);
    const { samplingRunning } = useSelector(appState);
    const dataLoggerActive =
        useSelector(getRecordingMode) === 'DataLogger' && samplingRunning;

    const [internalTriggerLength, setInternalTriggerLength] =
        useState(recordingLength);
    const [triggerOffsetValue, setTriggerOffsetValue] = useState(triggerOffset);

    useEffect(() => {
        setInternalTriggerLength(recordingLength);
    }, [recordingLength]);

    useEffect(() => {
        setTriggerOffsetValue(triggerOffset);
    }, [triggerOffset]);

    return (
        <>
            <NumberInput
                range={{
                    min: 1,
                    max: 1000,
                    decimals: 2,
                    step: 0.01,
                }}
                title="Duration of trigger window"
                value={internalTriggerLength}
                onChange={setInternalTriggerLength}
                onChangeComplete={(value: number) => {
                    dispatch(setTriggerRecordingLength(value));
                }}
                unit="ms"
                label="Length"
                disabled={dataLoggerActive}
                showSlider
            />
            <NumberInput
                range={{
                    min: 0,
                    max: 1000,
                    decimals: 2,
                    step: 0.01,
                }}
                title="Duration of the pre-trigger data sampling"
                value={triggerOffsetValue}
                onChange={setTriggerOffsetValue}
                onChangeComplete={(value: number) => {
                    dispatch(setTriggerOffset(value));
                }}
                unit="ms"
                label="Offset"
                disabled={dataLoggerActive}
                showSlider
            />
        </>
    );
};
