/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import persistentStore from '../utils/persistentStore';

const initialState = {
    portName: null,
    metadata: [],
    isSmuMode: false,
    deviceRunning: false,
    rttRunning: false,
    advancedMode: false,
    capabilities: {},
    samplingRunning: false,
    isSaveChoiceDialogVisible: false,
    isExportDialogVisible: false,
    fileLoaded: false,
};

const DEVICE_CLOSED = 'DEVICE_CLOSED';
const DEVICE_OPENED = 'DEVICE_OPENED';
const SET_DEVICE_RUNNING = 'SET_DEVICE_RUNNING';
const RTT_CALLED_START = 'RTT_CALLED_START';
const SAMPLING_STARTED = 'SAMPLING_STARTED';
const SAMPLING_STOPPED = 'SAMPLING_STOPPED';
const SET_POWER_MODE = 'SET_POWER_MODE';
const TOGGLE_ADVANCED_MODE = 'TOGGLE_ADVANCED_MODE';
const TOGGLE_SAVE_CHOICE_DIALOG = 'TOGGLE_SAVE_CHOICE_DIALOG';
const SHOW_EXPORT_DIALOG = 'SHOW_EXPORT_DIALOG';
const HIDE_EXPORT_DIALOG = 'HIDE_EXPORT_DIALOG';
const SET_FILE_LOADED = 'SET_FILE_LOADED';

// This action is defined in pc-nrfconnect-launcher:
const SET_CURRENT_PANE = 'SET_CURRENT_PANE';

export const toggleAdvancedModeAction = () => ({ type: TOGGLE_ADVANCED_MODE });
export const samplingStartAction = () => ({ type: SAMPLING_STARTED });
export const samplingStoppedAction = () => ({ type: SAMPLING_STOPPED });

export const deviceOpenedAction = (portName, capabilities) => ({
    type: DEVICE_OPENED,
    portName,
    capabilities,
});

export const deviceClosedAction = () => ({ type: DEVICE_CLOSED });
export const setDeviceRunningAction = isRunning => ({
    type: SET_DEVICE_RUNNING,
    isRunning,
});

export const setPowerModeAction = isSmuMode => ({
    type: SET_POWER_MODE,
    isSmuMode,
});

export const rttStartAction = () => ({ type: RTT_CALLED_START });
export const toggleSaveChoiceDialog = () => ({
    type: TOGGLE_SAVE_CHOICE_DIALOG,
});
export const showExportDialog = () => ({ type: SHOW_EXPORT_DIALOG });
export const hideExportDialog = () => ({ type: HIDE_EXPORT_DIALOG });

export const setFileLoadedAction = loaded => ({
    type: SET_FILE_LOADED,
    loaded,
});

export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case DEVICE_OPENED: {
            const { portName, capabilities } = action;
            return {
                ...state,
                portName,
                capabilities: { ...capabilities },
            };
        }
        case DEVICE_CLOSED:
            return initialState;
        case SET_DEVICE_RUNNING:
            return { ...state, deviceRunning: action.isRunning };
        case SET_POWER_MODE:
            return { ...state, ...action };
        case RTT_CALLED_START:
            return { ...state, rttRunning: true };
        case TOGGLE_ADVANCED_MODE:
            return { ...state, advancedMode: !state.advancedMode };
        case TOGGLE_SAVE_CHOICE_DIALOG:
            return {
                ...state,
                isSaveChoiceDialogVisible: !state.isSaveChoiceDialogVisible,
            };
        case SET_FILE_LOADED:
            return {
                ...state,
                fileLoaded: action.loaded,
            };
        case SHOW_EXPORT_DIALOG:
            return { ...state, isExportDialogVisible: true };
        case HIDE_EXPORT_DIALOG:
            return { ...state, isExportDialogVisible: false };
        case SAMPLING_STARTED:
            return { ...state, samplingRunning: true };
        case SAMPLING_STOPPED:
            return { ...state, samplingRunning: false };
        case SET_CURRENT_PANE:
            persistentStore.set('currentPane', action.currentPane);
            return state;
        default:
    }
    return state;
};

export const appState = ({ app }) => app.app;

export const advancedMode = state => state.app.app.advancedMode;
export const deviceOpen = state =>
    Object.keys(state.app.app.capabilities).length > 0;
