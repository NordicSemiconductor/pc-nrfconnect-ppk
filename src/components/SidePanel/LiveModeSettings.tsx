/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    DropdownItem,
    NumberInput,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import {
    dataLoggerState,
    updateDuration,
    updateDurationUnit,
} from '../../slices/dataLoggerSlice';
import { TimeUnit } from '../../utils/persistentStore';

export default () => {
    const dispatch = useDispatch();

    const { samplingRunning } = useSelector(appState);
    const { duration, durationUnit } = useSelector(dataLoggerState);
    const sampleIndefinitely = durationUnit === 'inf';

    const uintDropdownItem: DropdownItem<TimeUnit>[] = [
        { value: 's', label: 'seconds' },
        { value: 'm', label: 'minutes' },
        { value: 'h', label: 'hours' },
        { value: 'd', label: 'days' },
        { value: 'inf', label: 'forever' },
    ];

    return (
        <NumberInput
            label="Sample for"
            range={{
                min: 1,
                max: sampleIndefinitely ? Infinity : 60 * 60,
            }}
            value={sampleIndefinitely ? Infinity : duration}
            onChange={(v: number) => dispatch(updateDuration(v))}
            unit={{
                selectedItem:
                    uintDropdownItem.find(v => v.value === durationUnit) ??
                    uintDropdownItem[0],
                items: uintDropdownItem,
                onUnitChange: v => {
                    dispatch(updateDurationUnit(v.value));
                },
            }}
            disabled={samplingRunning}
            showSlider={!sampleIndefinitely}
            minWidth
        />
    );
};
