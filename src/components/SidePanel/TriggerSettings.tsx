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
    DigitalChannelTriggerState,
    DigitalChannelTriggerStatesEnum,
    getDigitalChannelsTriggersStates,
    getTriggerEdge,
    getTriggerValue,
    setDigitalChannelsTriggersStates,
    setTriggerEdge,
    setTriggerLevel,
    TriggerEdgeValues,
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

export default () => {
    const dispatch = useDispatch();
    const triggerValue = useSelector(getTriggerValue);
    const triggerEdge = useSelector(getTriggerEdge);
    const { samplingRunning } = useSelector(appState);
    const dataLoggerActive =
        useSelector(getRecordingMode) === 'DataLogger' && samplingRunning;
    const digitalChannelTriggerStates = useSelector(
        getDigitalChannelsTriggersStates
    );

    const handleDigitalChannelsTriggerStateChange = (
        index: number,
        state: DigitalChannelTriggerState
    ) => {
        const newStates = [...digitalChannelTriggerStates];
        newStates[index] = state;
        dispatch(
            setDigitalChannelsTriggersStates({
                digitalChannelsTriggers: newStates,
            })
        );
    };

    const [levelUnit, setLevelUnit] = useState<CurrentUnit>('µA');

    const items: DropdownItem<CurrentUnit>[] = CurrentUnitValues.map(value => ({
        value,
        label: value,
    }));

    const [internalTriggerValue, setInternalTriggerValue] =
        useState(triggerValue);

    useEffect(() => {
        if (triggerValue > 1000) {
            setLevelUnit('mA');
            setInternalTriggerValue(Number((triggerValue / 1000).toFixed(4)));
        } else {
            setLevelUnit('µA');
            setInternalTriggerValue(Number(triggerValue.toFixed(3)));
        }
    }, [triggerValue]);

    return (
        <>
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
                items={[...TriggerEdgeValues]}
                onSelect={m => {
                    dispatch(setTriggerEdge(TriggerEdgeValues[m]));
                }}
                selectedItem={triggerEdge}
                disabled={samplingRunning}
            />
            <div className="tw-flex tw-flex-col tw-gap-0.5">
                {digitalChannelTriggerStates.map((state, index) => (
                    <div
                        key={`d-trigger-${index + 1}`}
                        className="tw-flex tw-flex-row tw-gap-3"
                    >
                        <span>{`Digital channel ${index}:`}</span>
                        <select
                            value={state}
                            onChange={e => {
                                handleDigitalChannelsTriggerStateChange(
                                    index,
                                    e.target.value as DigitalChannelTriggerState
                                );
                            }}
                        >
                            <option
                                value={DigitalChannelTriggerStatesEnum.Active}
                            >
                                {DigitalChannelTriggerStatesEnum.Active}
                            </option>
                            <option
                                value={DigitalChannelTriggerStatesEnum.Inactive}
                            >
                                {DigitalChannelTriggerStatesEnum.Inactive}
                            </option>
                            <option
                                value={DigitalChannelTriggerStatesEnum.DontCare}
                            >
                                {DigitalChannelTriggerStatesEnum.DontCare}
                            </option>
                        </select>
                    </div>
                ))}
            </div>
        </>
    );
};
