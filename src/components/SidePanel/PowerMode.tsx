/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Group,
    StateSelector,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { setDeviceRunning, setPowerMode } from '../../actions/deviceActions';
import { appState, isSamplingRunning } from '../../slices/appSlice';
import VoltageRegulator from './VoltageRegulator';

export default () => {
    const dispatch = useDispatch();
    const { capabilities, isSmuMode, deviceRunning } = useSelector(appState);
    const samplingRunning = useSelector(isSamplingRunning);

    const togglePowerMode = () => dispatch(setPowerMode(!isSmuMode));

    const items = [
        {
            key: 'Source',
            renderItem: (
                <>
                    <span>Source meter</span>{' '}
                    <div
                        className={`tw-absolute tw-right-[1px] tw-top-[1px] tw-h-[6px] tw-w-[6px] tw-rounded-[6px] tw-bg-red ${
                            isSmuMode ? 'tw-block' : 'tw-hidden'
                        }`}
                    />
                </>
            ),
        },
        {
            key: 'Ampere',
            renderItem: (
                <>
                    <span> Ampere meter</span>
                    <div
                        className={`tw-absolute tw-right-[1px] tw-top-[1px] tw-h-[6px] tw-w-[6px] tw-rounded-[6px] tw-bg-nordicBlue ${
                            isSmuMode ? 'tw-hidden' : 'tw-block'
                        }`}
                    />
                </>
            ),
        },
    ];

    return (
        <Group
            heading={`${
                capabilities.ppkSetPowerMode ? 'Power Supply Mode' : ''
            }`}
            gap={4}
        >
            {capabilities.ppkSetPowerMode && (
                <StateSelector
                    items={items}
                    onSelect={togglePowerMode}
                    selectedItem={items[isSmuMode ? 0 : 1]}
                    disabled={samplingRunning}
                />
            )}
            <VoltageRegulator />
            {capabilities.ppkDeviceRunning && (
                <Toggle
                    title="Turn power on/off for device under test"
                    onToggle={() => dispatch(setDeviceRunning(!deviceRunning))}
                    isToggled={deviceRunning}
                    label="Enable power output"
                    variant="primary"
                />
            )}
        </Group>
    );
};
