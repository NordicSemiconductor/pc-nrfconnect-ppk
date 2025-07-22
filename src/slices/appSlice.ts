/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
// TODO: Remove next line
/* eslint-disable @typescript-eslint/no-explicit-any -- included for conservative refactoring to typescript */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import os from 'os';

import { Capabilities } from '../device/abstractDevice';
import {
    getDiskFullTrigger as getPersistedDiskFullTrigger,
    getPreferredSessionLocation,
} from '../utils/persistentStore';
import type { RootState } from '.';

interface AppState {
    portName: null | any;
    metadata: any[];
    isSmuMode: boolean;
    deviceRunning: boolean;
    capabilities: Capabilities;
    samplingRunning: boolean;
    isSaveChoiceDialogVisible: boolean;
    isExportDialogVisible: boolean;
    fileLoadedName?: string;
    diskFullLimitMb?: number;
    sessionFolder?: string;
    savePending: boolean;
    sessionRecoveryPending: boolean;
}

const initialState = (): AppState => ({
    portName: null,
    metadata: [],
    isSmuMode: false,
    deviceRunning: false,
    capabilities: {},
    samplingRunning: false,
    isSaveChoiceDialogVisible: false,
    isExportDialogVisible: false,
    savePending: false,
    sessionRecoveryPending: false,
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
        deviceClosedAction: state => ({
            ...initialState(),
            savePending: state.savePending,
            sessionRecoveryPending: state.sessionRecoveryPending,
        }),
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
        setFileLoadedAction: (state, action: PayloadAction<string>) => {
            state.fileLoadedName = action.payload;
        },
        clearFileLoadedAction: state => {
            state.fileLoadedName = undefined;
        },
        samplingStartAction: state => {
            state.samplingRunning = true;
        },
        samplingStoppedAction: state => {
            state.samplingRunning = false;
        },
        setSessionRootFolder: (state, action: PayloadAction<string>) => {
            state.sessionFolder = action.payload;
        },
        setDiskFullTrigger: (state, action: PayloadAction<number>) => {
            state.diskFullLimitMb = action.payload;
        },
        setSavePending: (state, action: PayloadAction<boolean>) => {
            state.savePending = action.payload;
        },
        setSessionRecoveryPending: (state, action: PayloadAction<boolean>) => {
            state.sessionRecoveryPending = action.payload;
        },
    },
});

export const isSamplingRunning = (state: RootState) =>
    state.app.app.samplingRunning;
export const appState = (state: RootState) => state.app.app;
export const deviceOpen = (state: RootState) =>
    Object.keys(state.app.app.capabilities).length > 0;
export const getSessionRootFolder = (state: RootState) =>
    state.app.app.sessionFolder ?? getPreferredSessionLocation(os.tmpdir());
export const getDiskFullTrigger = (state: RootState) =>
    state.app.app.diskFullLimitMb ?? getPersistedDiskFullTrigger(4096);
export const isSavePending = (state: RootState) => state.app.app.savePending;
export const isSessionRecoveryPending = (state: RootState) =>
    state.app.app.sessionRecoveryPending;
export const getFileLoaded = (state: RootState) => state.app.app.fileLoadedName;
export const isFileLoaded = (state: RootState) =>
    !!state.app.app.fileLoadedName;

export const {
    deviceOpenedAction,
    deviceClosedAction,
    setDeviceRunningAction,
    setPowerModeAction,
    toggleSaveChoiceDialog,
    showExportDialog,
    hideExportDialog,
    setFileLoadedAction,
    samplingStartAction,
    samplingStoppedAction,
    setSessionRootFolder,
    setDiskFullTrigger,
    setSavePending,
    setSessionRecoveryPending,
    clearFileLoadedAction,
} = appSlice.actions;

export default appSlice.reducer;
