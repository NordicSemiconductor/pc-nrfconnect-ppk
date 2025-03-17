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
    getTriggerBias,
    getTriggerRecordingLength,
    setTriggerBias,
    setTriggerRecordingLength,
} from '../../slices/triggerSlice';

const calculateBiasTime = (recordingLength: number, bias: number) =>
    Number((recordingLength * (bias / 100)).toFixed(2));

export default () => {
    const dispatch = useDispatch();
    const recordingLength = useSelector(getTriggerRecordingLength);
    const triggerBias = useSelector(getTriggerBias);
    const { samplingRunning } = useSelector(appState);
    const dataLoggerActive =
        useSelector(getRecordingMode) === 'DataLogger' && samplingRunning;

    const [internalTriggerLength, setInternalTriggerLength] =
        useState(recordingLength);
    const [triggerBiasValue, setTriggerBiasValue] = useState(triggerBias);
    const [computedBias, setComputedBias] = useState(
        calculateBiasTime(internalTriggerLength, triggerBias)
    );

    useEffect(() => {
        setInternalTriggerLength(recordingLength);
    }, [recordingLength]);

    useEffect(() => {
        setTriggerBiasValue(triggerBias);
    }, [triggerBias]);

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
                    setComputedBias(calculateBiasTime(value, triggerBias));
                }}
                unit="ms"
                label="Length"
                disabled={dataLoggerActive}
                showSlider
            />
            <NumberInput
                range={{
                    min: 0,
                    max: 100,
                    decimals: 0,
                    step: 1,
                }}
                title='Trigger bias from "Start of trigger window"'
                value={triggerBiasValue}
                onChange={setTriggerBiasValue}
                onChangeComplete={(value: number) => {
                    dispatch(setTriggerBias(value));
                    setComputedBias(
                        calculateBiasTime(internalTriggerLength, value)
                    );
                }}
                unit="%"
                label="Bias"
                disabled={dataLoggerActive}
                showSlider
            />
            <span className="tw-mb-2 tw-text-sm tw-text-gray-500">
                Computed bias: {computedBias} ms
            </span>
        </>
    );
};
