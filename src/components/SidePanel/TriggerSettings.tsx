/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    DropdownItem,
    NumberInput,
    StateSelector,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import { getRecordingMode } from '../../slices/chartSlice';
import {
    getTriggerBias,
    getTriggerEdge,
    getTriggerRecordingLength,
    getTriggerType,
    getTriggerValue,
    setTriggerBias,
    setTriggerEdge,
    setTriggerLevel,
    setTriggerRecordingLength,
    setTriggerType,
    TriggerEdgeValues,
    TriggerTypeValues,
} from '../../slices/triggerSlice';

const CurrentUnitValues = ['mA', '\u00B5A'] as const;
type CurrentUnit = (typeof CurrentUnitValues)[number];

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

const calculateBiasTime = (recordingLength: number, bias: number) =>
    Number((recordingLength * (bias / 100)).toFixed(2));

export default () => {
    const dispatch = useDispatch();
    const recordingLength = useSelector(getTriggerRecordingLength);
    const triggerBias = useSelector(getTriggerBias);
    const triggerValue = useSelector(getTriggerValue);
    const triggerType = useSelector(getTriggerType);
    const triggerEdge = useSelector(getTriggerEdge);
    const { samplingRunning } = useSelector(appState);
    const dataLoggerActive =
        useSelector(getRecordingMode) === 'DataLogger' && samplingRunning;

    const [levelUnit, setLevelUnit] = useState<CurrentUnit>('µA');

    const items: DropdownItem<CurrentUnit>[] = CurrentUnitValues.map(value => ({
        value,
        label: value,
    }));

    const [internalTriggerValue, setInternalTriggerValue] =
        useState(triggerValue);
    const [internalTriggerLength, setInternalTriggerLength] =
        useState(recordingLength);
    const [triggerBiasValue, setTriggerBiasValue] = useState(triggerBias);
    const [computedBias, setComputedBias] = useState(
        calculateBiasTime(internalTriggerLength, triggerBias)
    );

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
            <NumberInput
                range={{
                    min: getMin(levelUnit),
                    max: levelUnit === 'µA' ? 2000 : 1000,
                    decimals: levelUnit === 'µA' ? 3 : 4,
                    step: 0.001,
                }}
                title="Rising edge level to run trigger"
                value={internalTriggerValue}
                onChange={v => setInternalTriggerValue(v)}
                onChangeComplete={(value: number) => {
                    dispatch(
                        setTriggerLevel(convertToMicroAmps(levelUnit, value))
                    );
                }}
                unit={{
                    items,
                    onUnitChange: unit => {
                        dispatch(
                            setTriggerLevel(
                                convertToMicroAmps(
                                    unit.value,
                                    internalTriggerValue
                                )
                            )
                        );
                    },
                    selectedItem: items.find(item => item.value === levelUnit),
                }}
                label="Level"
                disabled={dataLoggerActive}
                showSlider
            />
            <StateSelector
                items={[...TriggerTypeValues]}
                onSelect={m => dispatch(setTriggerType(TriggerTypeValues[m]))}
                selectedItem={triggerType}
                disabled={samplingRunning}
            />
            <StateSelector
                items={[...TriggerEdgeValues]}
                onSelect={m => {
                    dispatch(setTriggerEdge(TriggerEdgeValues[m]));
                }}
                selectedItem={triggerEdge}
                disabled={samplingRunning}
            />
        </>
    );
};
