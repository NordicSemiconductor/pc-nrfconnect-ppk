/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- conservative refactoring, TODO: remove this line */

import React from 'react';
import { useSelector } from 'react-redux';
import { unit } from 'mathjs';

import { appState } from '../../slices/appSlice';
import { voltageRegulatorState } from '../../slices/voltageRegulatorSlice';
import { formatDurationHTML } from '../../utils/duration';
import { Value, ValueRaw } from './StatBoxHelpers';

interface StatBoxProperties {
    average?: number | null;
    max?: number | null;
    delta?: number | null;
}

export default ({
    average = null,
    max = null,
    delta = null,
}: StatBoxProperties) => {
    const { isSmuMode } = useSelector(appState);
    const { vdd, currentVDD } = useSelector(voltageRegulatorState);

    // Get voltage based on power supply mode
    // In Source meter mode, use the set voltage (vdd)
    // In Ampere meter mode, you might want to use a different voltage source
    // For now, using currentVDD which represents the actual voltage being supplied
    const voltage = currentVDD / 1000; // Convert mV to V

    const timeSeconds = (delta || 1) / 1e6; // Convert µs to seconds
    const averageAmps = (average || 0) / 1e6; // Convert µA to A
    const chargeCoulombs = averageAmps * timeSeconds;
    const energyMilliwattHours = voltage * chargeCoulombs * 3.6;

    console.log(voltage, currentVDD, isSmuMode);

    return (
        <div className="tw-preflight tw-flex tw-w-80 tw-grow tw-flex-col tw-gap-1 tw-text-center">
            <div className="tw-flex tw-h-3.5 tw-items-center tw-justify-between">
                <h2 className="tw-inline tw-text-[10px] tw-uppercase">
                    Window
                </h2>
            </div>
            <div className="tw-flex tw-flex-row tw-gap-[1px] tw-border tw-border-solid tw-border-gray-200 tw-bg-gray-200">
                <Value label="average" u={unit(average!, 'uA')} white />
                <Value label="max" u={unit(max || 0, 'uA')} white />
                <ValueRaw
                    label="time"
                    value={formatDurationHTML(delta ?? 0)}
                    white
                />
                <Value
                    white
                    label="charge"
                    u={unit(average! * ((delta || 1) / 1e6), 'uC')}
                />
                {isSmuMode && (
                    <Value
                        white
                        label="energy"
                        u={unit(energyMilliwattHours, 'mWh')}
                    />
                )}
            </div>
        </div>
    );
};
