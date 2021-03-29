/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentPane, SidePanel, useHotKey } from 'pc-nrfconnect-shared';

import { options } from '../../globals';
import {
    advancedMode as advancedModeSelector,
    appState,
    deviceOpen as deviceOpenSelector,
    toggleAdvancedModeAction,
} from '../../reducers/appReducer';
import { isDataLoggerPane, isRealTimePane } from '../../utils/panes';
import DisplayOptions from './DisplayOptions';
import Gains from './Gains';
import Instructions from './Instructions';
import { Load, Save } from './LoadSave';
import PowerMode from './PowerMode';
import ResistorCalibration from './ResistorCalibration';
import SpikeFilter from './SpikeFilter';
import StartStop from './StartStop';
import SwitchPoints from './SwitchPoints';
import Trigger from './Trigger/Trigger';

import './sidepanel.scss';

export default () => {
    const dispatch = useDispatch();
    useHotKey('alt+ctrl+shift+a', () => dispatch(toggleAdvancedModeAction()));

    const advancedMode = useSelector(advancedModeSelector);
    const deviceOpen = useSelector(deviceOpenSelector);
    const { fileLoaded } = useSelector(appState);

    const realTimePane = useSelector(isRealTimePane);
    const dataLoggerPane = useSelector(isDataLoggerPane);

    if (fileLoaded) {
        return (
            <SidePanel className="side-panel">
                <Load />
                <DisplayOptions />
                <Save />
            </SidePanel>
        );
    }

    if (!deviceOpen) {
        return (
            <SidePanel className="side-panel">
                <Load />
                <Instructions />
            </SidePanel>
        );
    }

    if (!realTimePane && !dataLoggerPane) {
        return null;
    }

    return (
        <SidePanel className="side-panel">
            <PowerMode />
            {realTimePane && <Trigger />}
            {dataLoggerPane && <StartStop />}
            {options.timestamp === null || (
                <>
                    <DisplayOptions />
                    <Save />
                </>
            )}
            {deviceOpen && advancedMode && (
                <>
                    <SwitchPoints />
                    <ResistorCalibration />
                    <Gains />
                    <SpikeFilter />
                </>
            )}
        </SidePanel>
    );
};
