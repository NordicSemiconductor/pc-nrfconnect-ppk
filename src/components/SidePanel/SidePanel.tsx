/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectedDevice,
    SidePanel,
    Spinner,
    useHotKey,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import DeprecatedDeviceDialog from '../../features/DeprecatedDevice/DeprecatedDevice';
import ProgressDialog from '../../features/ProgressDialog/ProgressDialog';
import { getShowProgressDialog } from '../../features/ProgressDialog/progressSlice';
import { updateTitle } from '../../globals';
import {
    advancedMode as advancedModeSelector,
    deviceOpen as deviceOpenSelector,
    getFileLoaded,
    isFileLoaded,
    isSavePending,
    toggleAdvancedModeAction,
} from '../../slices/appSlice';
import { isSessionActive } from '../../slices/chartSlice';
import { isDataLoggerPane, isRealTimePane } from '../../utils/panes';
import { CapVoltageSettings } from './CapVoltageSettings';
import DisplayOptions from './DisplayOptions';
import Gains from './Gains';
import Instructions from './Instructions';
import { Load, Save } from './LoadSave';
import PowerMode from './PowerMode';
import SessionSettings from './SessionSettings';
import SpikeFilter from './SpikeFilter';
import StartStop from './StartStop';

import './sidepanel.scss';

const useAppTitle = () => {
    const device = useSelector(selectedDevice);
    const fileName = useSelector(getFileLoaded);
    const pendingSave = useSelector(isSavePending);

    useEffect(() => {
        if (fileName) {
            updateTitle(fileName);
            return;
        }

        let title = '';
        if (device?.serialNumber) {
            title += device.serialNumber;
        }

        if (pendingSave) {
            title += ' - Unsaved data*';
        }

        updateTitle(title);
    });

    return null;
};

export default () => {
    const dispatch = useDispatch();

    useAppTitle();
    const advancedMode = useSelector(advancedModeSelector);
    const deviceConnected = useSelector(selectedDevice);
    const deviceOpen = useSelector(deviceOpenSelector);
    const fileLoaded = useSelector(isFileLoaded);
    const sessionActive = useSelector(isSessionActive);
    const showProgressDialog = useSelector(getShowProgressDialog);
    const realTimePane = useSelector(isRealTimePane);
    const dataLoggerPane = useSelector(isDataLoggerPane);

    useHotKey({
        hotKey: 'alt+ctrl+shift+a',
        title: 'Show advanced config',
        isGlobal: false,
        action: () => dispatch(toggleAdvancedModeAction()),
    });

    const connecting = deviceConnected && !deviceOpen;

    return (
        <SidePanel className="side-panel tw-mt-9">
            {connecting && (
                <div className="tw-text-center tw-text-base">
                    <span>Connecting...</span> <Spinner size="sm" />
                </div>
            )}
            {!deviceConnected && (
                <>
                    <Load />
                    <SessionSettings />
                </>
            )}
            {!fileLoaded && !deviceConnected && !sessionActive && (
                <Instructions />
            )}
            {!fileLoaded && deviceOpen && (realTimePane || dataLoggerPane) && (
                <>
                    <PowerMode />
                    <StartStop />
                </>
            )}
            {!connecting &&
                (fileLoaded || deviceOpen || sessionActive) &&
                (realTimePane || dataLoggerPane) && (
                    <>
                        <DisplayOptions />
                        <Save />
                    </>
                )}
            {!fileLoaded && deviceOpen && advancedMode && (
                <>
                    <Gains />
                    <SpikeFilter />
                    <CapVoltageSettings />
                </>
            )}
            <DeprecatedDeviceDialog />
            {showProgressDialog && <ProgressDialog />}
        </SidePanel>
    );
};
