/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
// TODO: Remove next line
/* eslint-disable @typescript-eslint/no-explicit-any -- included for conservative refactoring to typescript */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { Capabilities } from '../device/abstractDevice';
import type { RootState } from '.';

interface AppState {
    portName: null | any;
    metadata: any[];
    isSmuMode: boolean;
    deviceRunning: boolean;
    advancedMode: boolean;
    capabilities: Capabilities;
    samplingRunning: boolean;
    isSaveChoiceDialogVisible: boolean;
    isExportDialogVisible: boolean;
    fileLoaded: boolean;
}

const initialState = (): AppState => ({
    portName: null,
    metadata: [],
    isSmuMode: false,
    deviceRunning: false,
    advancedMode: false,
    capabilities: {},
    samplingRunning: false,
    isSaveChoiceDialogVisible: false,
    isExportDialogVisible: false,
    fileLoaded: false,
});

const appSlice = createSlice({
    name: 'app',
    initialState: initialState(),
    reducers: {
        deviceOpenedAction: (
            state,
            action: PayloadAction<{
                capabilities: any;
                portName: any;
            }>
        ) => {
            state.portName = action.payload.portName;
            state.capabilities = action.payload.capabilities;
        },
        deviceClosedAction: () => initialState(),
        setDeviceRunningAction: (
            state,
            action: PayloadAction<{ isRunning: boolean }>
        ) => {
            state.deviceRunning = action.payload.isRunning;
        },
        setPowerModeAction: (
            state,
            action: PayloadAction<{ isSmuMode: boolean }>
        ) => {
            state.isSmuMode = action.payload.isSmuMode;
        },
        toggleSaveChoiceDialog: state => {
            state.isSaveChoiceDialogVisible = !state.isSaveChoiceDialogVisible;
        },
        showExportDialog: state => {
            state.isExportDialogVisible = true;
        },
        hideExportDialog: state => {
            state.isExportDialogVisible = false;
        },
        setFileLoadedAction: (
            state,
            action: PayloadAction<{ loaded: boolean }>
        ) => {
            state.fileLoaded = action.payload.loaded;
        },
        toggleAdvancedModeAction: state => {
            state.advancedMode = !state.advancedMode;
        },
        samplingStartAction: state => {
            state.samplingRunning = true;
        },
        samplingStoppedAction: state => {
            state.samplingRunning = false;
        },
    },
});

export const appState = (state: RootState) => state.app.app;
export const advancedMode = (state: RootState) => state.app.app.advancedMode;
export const deviceOpen = (state: RootState) =>
    Object.keys(state.app.app.capabilities).length > 0;

export const {
    deviceOpenedAction,
    deviceClosedAction,
    setDeviceRunningAction,
    setPowerModeAction,
    toggleSaveChoiceDialog,
    showExportDialog,
    hideExportDialog,
    setFileLoadedAction,
    toggleAdvancedModeAction,
    samplingStartAction,
    samplingStoppedAction,
} = appSlice.actions;

export default appSlice.reducer;
