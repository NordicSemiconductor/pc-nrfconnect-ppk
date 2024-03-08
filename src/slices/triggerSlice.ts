/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    getRecordingLength as getPersistedRecordingLength,
    getTriggerLevel as getPersistedTriggerLevel,
    getTriggerType as getPersistedTriggerType,
    setRecordingLength as persistRecordingLength,
    setTriggerLevel as persistTriggerLevel,
    setTriggerType as persistTriggerType,
} from '../utils/persistentStore';
import type { RootState } from '.';

export const TriggerTypeValues = ['Single', 'Continuous'] as const;
export type TriggerType = (typeof TriggerTypeValues)[number];

export interface DataLoggerState {
    level: number;
    recordingLength: number;
    active: boolean;
    type: TriggerType;
    progressMessage?: string;
    progress?: number;
    triggerOrigin?: number;
}

const initialState = (): DataLoggerState => ({
    level: getPersistedTriggerLevel(1000),
    recordingLength: getPersistedRecordingLength(1000),
    active: false,
    type: getPersistedTriggerType('Single'),
});

const triggerSlice = createSlice({
    name: 'trigger',
    initialState: initialState(),
    reducers: {
        setTriggerLevel: (state, action: PayloadAction<number>) => {
            state.level = action.payload;
            state.active = false;
            persistTriggerLevel(action.payload);
        },
        setTriggerRecordingLength: (state, action: PayloadAction<number>) => {
            state.recordingLength = action.payload;
            persistRecordingLength(action.payload);
        },
        setTriggerActive: (state, action: PayloadAction<boolean>) => {
            state.active = action.payload;
        },
        setTriggerType: (state, action: PayloadAction<TriggerType>) => {
            state.type = action.payload;
            persistTriggerType(action.payload);
        },
        setProgress: (
            state,
            action: PayloadAction<{
                progressMessage: string;
                progress?: number;
            }>
        ) => {
            state.progress = action.payload.progress;
            state.progressMessage = action.payload.progressMessage;
        },
        clearProgress: state => {
            state.progress = undefined;
            state.progressMessage = undefined;
        },
        setTriggerOrigin: (state, action: PayloadAction<number>) => {
            state.triggerOrigin = action.payload;
        },
        resetTriggerOrigin: state => {
            state.triggerOrigin = undefined;
        },
    },
});
export const getTriggerValue = (state: RootState) => state.app.trigger.level;
export const getTriggerRecordingLength = (state: RootState) =>
    state.app.trigger.recordingLength;
export const getTriggerActive = (state: RootState) => state.app.trigger.active;
export const getTriggerType = (state: RootState) => state.app.trigger.type;
export const getProgress = (state: RootState) => ({
    progressMessage: state.app.trigger.progressMessage,
    progress: state.app.trigger.progress,
});
export const getTriggerOrigin = (state: RootState) =>
    state.app.trigger.triggerOrigin;

export const {
    setTriggerLevel,
    setTriggerRecordingLength,
    setTriggerActive,
    setTriggerType,
    setProgress,
    clearProgress,
    setTriggerOrigin,
    resetTriggerOrigin,
} = triggerSlice.actions;

export default triggerSlice.reducer;
