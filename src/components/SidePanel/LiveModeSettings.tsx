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
    Slider,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import {
    dataLoggerState,
    getSampleFrequency,
    updateDuration,
    updateDurationUnit,
    updateSampleFreqLog10,
} from '../../slices/dataLoggerSlice';
import { TimeUnit } from '../../utils/persistentStore';

export default () => {
    const dispatch = useDispatch();

    const { samplingRunning } = useSelector(appState);
    const { duration, durationUnit, sampleFreqLog10, maxFreqLog10 } =
        useSelector(dataLoggerState);

    const sampleFreq = useSelector(getSampleFrequency);

    const sampleIndefinitely = durationUnit === 'inf';

    const uintDropdownItem: DropdownItem<TimeUnit>[] = [
        { value: 's', label: 'seconds' },
        { value: 'm', label: 'minutes' },
        { value: 'h', label: 'hours' },
        { value: 'd', label: 'days' },
        { value: 'inf', label: 'forever' },
    ];

    return (
        <>
            <div className="tw-flex tw-flex-col tw-gap-1 tw-text-xs">
                <div>{sampleFreq.toLocaleString('en')} samples per second</div>
                <Slider
                    id="data-logger-sampling-frequency"
                    values={[sampleFreqLog10]}
                    range={{ min: 0, max: maxFreqLog10 }}
                    onChange={[
                        v =>
                            dispatch(
                                updateSampleFreqLog10({
                                    sampleFreqLog10: v,
                                })
                            ),
                    ]}
                    onChangeComplete={() => {}}
                    disabled={samplingRunning}
                    ticks
                />
            </div>
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
                inputMinSize={sampleIndefinitely ? 4 : undefined}
            />
        </>
    );
};
