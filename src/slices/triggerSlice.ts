/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    getDigitalChannelsTriggers as getPersistedDigitalChannelsTriggers,
    getRecordingLength as getPersistedRecordingLength,
    getTriggerBias as getPersistedTriggerBias,
    getTriggerCategory as getPersistedTriggerCategory,
    getTriggerEdge as getPersistedTriggerEdge,
    getTriggerLevel as getPersistedTriggerLevel,
    getTriggerType as getPersistedTriggerType,
    setDigitalChannelsTriggers as persistDigitalChannelsTriggers,
    setRecordingLength as persistRecordingLength,
    setTriggerBias as persistTriggerBias,
    setTriggerCategory as persistTriggerCategory,
    setTriggerEdge as persistTriggerEdge,
    setTriggerLevel as persistTriggerLevel,
    setTriggerType as persistTriggerType,
} from '../utils/persistentStore';
import type { RootState } from '.';

export const TriggerCategoryValues = ['Digital', 'Analog'] as const;
export type TriggerCategory = (typeof TriggerCategoryValues)[number];
export const TriggerTypeValues = ['Single', 'Continuous'] as const;
export type TriggerType = (typeof TriggerTypeValues)[number];
export const TriggerEdgeValues = ['Raising Edge', 'Lowering Edge'] as const;
export type TriggerEdge = (typeof TriggerEdgeValues)[number];
export enum DigitalChannelTriggerStatesEnum {
    Active = 'Active',
    Inactive = 'Inactive',
    DontCare = "Don't care",
}
export type DigitalChannelTriggerState =
    keyof typeof DigitalChannelTriggerStatesEnum;

export interface DataLoggerState {
    level: number;
    recordingLength: number;
    bias: number;
    active: boolean;
    category: TriggerCategory;
    type: TriggerType;
    edge: TriggerEdge;
    progressMessage?: string;
    progress?: number;
    triggerOrigin?: number;
    digitalChannelsTriggersStates: DigitalChannelTriggerState[];
}

const initialState = (): DataLoggerState => ({
    level: getPersistedTriggerLevel(1000),
    recordingLength: getPersistedRecordingLength(1000),
    bias: getPersistedTriggerBias(0),
    active: false,
    category: getPersistedTriggerCategory('Analog'),
    type: getPersistedTriggerType('Single'),
    edge: getPersistedTriggerEdge('Raising Edge'),
    digitalChannelsTriggersStates: getPersistedDigitalChannelsTriggers(),
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
        setTriggerBias: (state, action: PayloadAction<number>) => {
            state.bias = action.payload;
            persistTriggerBias(action.payload);
        },
        setTriggerActive: (state, action: PayloadAction<boolean>) => {
            state.active = action.payload;
        },
        setTriggerCategory: (state, action: PayloadAction<TriggerCategory>) => {
            state.category = action.payload;
            persistTriggerCategory(action.payload);
        },
        setTriggerType: (state, action: PayloadAction<TriggerType>) => {
            state.type = action.payload;
            persistTriggerType(action.payload);
        },
        setTriggerEdge: (state, action: PayloadAction<TriggerEdge>) => {
            state.edge = action.payload;
            persistTriggerEdge(action.payload);
        },
        setDigitalChannelsTriggersStates: (
            state,
            action: PayloadAction<{
                digitalChannelsTriggers: DigitalChannelTriggerState[];
            }>
        ) => {
            state.digitalChannelsTriggersStates =
                action.payload.digitalChannelsTriggers;
            persistDigitalChannelsTriggers(
                action.payload.digitalChannelsTriggers
            );
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
export const getTriggerBias = (state: RootState) => state.app.trigger.bias;
export const getTriggerActive = (state: RootState) => state.app.trigger.active;
export const getTriggerCategory = (state: RootState) =>
    state.app.trigger.category;
export const getTriggerType = (state: RootState) => state.app.trigger.type;
export const getTriggerEdge = (state: RootState) => state.app.trigger.edge;
export const getDigitalChannelsTriggersStates = (state: RootState) =>
    state.app.trigger.digitalChannelsTriggersStates;
export const getProgress = (state: RootState) => ({
    progressMessage: state.app.trigger.progressMessage,
    progress: state.app.trigger.progress,
});
export const getTriggerOrigin = (state: RootState) =>
    state.app.trigger.triggerOrigin;

export const {
    setTriggerLevel,
    setTriggerRecordingLength,
    setTriggerBias,
    setTriggerActive,
    setTriggerCategory,
    setTriggerType,
    setTriggerEdge,
    setDigitalChannelsTriggersStates,
    setProgress,
    clearProgress,
    setTriggerOrigin,
    resetTriggerOrigin,
} = triggerSlice.actions;

export default triggerSlice.reducer;
