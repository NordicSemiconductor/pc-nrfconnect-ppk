/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    SidePanel,
    useHotKey,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import DeprecatedDeviceDialog from '../../features/DeprecatedDevice/DeprecatedDevice';
import MinimapOptions from '../../features/minimap/MinimapOptions';
import {
    advancedMode as advancedModeSelector,
    appState,
    deviceOpen as deviceOpenSelector,
    toggleAdvancedModeAction,
} from '../../slices/appSlice';
import { isSessionActive } from '../../slices/chartSlice';
import { BufferSettings } from './BufferSettings';
import { CapVoltageSettings } from './CapVoltageSettings';
import DisplayOptions from './DisplayOptions';
import Gains from './Gains';
import Instructions from './Instructions';
import { Load, Save } from './LoadSave';
import PowerMode from './PowerMode';
import SpikeFilter from './SpikeFilter';
import StartStop from './StartStop';

import './sidepanel.scss';

export default () => {
    const dispatch = useDispatch();

    useHotKey({
        hotKey: 'alt+ctrl+shift+a',
        title: 'Show advanced config',
        isGlobal: false,
        action: () => dispatch(toggleAdvancedModeAction()),
    });

    const advancedMode = useSelector(advancedModeSelector);
    const deviceOpen = useSelector(deviceOpenSelector);
    const { fileLoaded } = useSelector(appState);
    const sessionActive = useSelector(isSessionActive);

    if (fileLoaded) {
        return (
            <SidePanel className="side-panel tw-mt-9">
                <Load />
                <DisplayOptions />
                <Save />
                <MinimapOptions />
                <DeprecatedDeviceDialog />
            </SidePanel>
        );
    }

    if (!deviceOpen) {
        return (
            <SidePanel className="side-panel tw-mt-9">
                <Load />
                {sessionActive && <Save />}
                <Instructions />
                <DeprecatedDeviceDialog />
            </SidePanel>
        );
    }

    return (
        <SidePanel className="side-panel tw-mt-9">
            <PowerMode />
            <StartStop />
            <MinimapOptions />
            <DisplayOptions />
            <Save />
            {advancedMode && (
                <>
                    <Gains />
                    <SpikeFilter />
                    <BufferSettings />
                    <CapVoltageSettings />
                </>
            )}
            <DeprecatedDeviceDialog />
        </SidePanel>
    );
};
