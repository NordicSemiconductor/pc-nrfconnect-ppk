/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    digitalChannelStateTupleOf8,
    getDigitalChannelsTriggerLogic as getPersistedDigitaTriggerLogic,
    getDigitalChannelsTriggers as getPersistedDigitalChannelsTriggers,
    getRecordingLength as getPersistedRecordingLength,
    getTriggerCategory as getPersistedTriggerCategory,
    getTriggerEdge as getPersistedTriggerEdge,
    getTriggerLevel as getPersistedTriggerLevel,
    getTriggerOffset as getPersistedTriggerOffset,
    getTriggerType as getPersistedTriggerType,
    setDigitalChannelsTriggerLogic as persistDigitaTriggerLogic,
    setDigitalChannelsTriggers as persistDigitalChannelsTriggers,
    setRecordingLength as persistRecordingLength,
    setTriggerCategory as persistTriggerCategory,
    setTriggerEdge as persistTriggerEdge,
    setTriggerLevel as persistTriggerLevel,
    setTriggerOffset as persistTriggerOffset,
    setTriggerType as persistTriggerType,
} from '../utils/persistentStore';
import type { RootState } from '.';

export const TriggerCategoryValues = ['Analog', 'Digital'] as const;
export type TriggerCategory = (typeof TriggerCategoryValues)[number];
export const TriggerTypeValues = ['Single', 'Continuous'] as const;
export type TriggerType = (typeof TriggerTypeValues)[number];
export const TriggerEdgeValues = ['Rising Edge', 'Falling Edge'] as const;
export type TriggerEdge = (typeof TriggerEdgeValues)[number];
export const DigitalChannelTriggerLogicOptions = ['AND', 'OR'] as const;
export type DigitalChannelTriggerLogic =
    (typeof DigitalChannelTriggerLogicOptions)[number];
export enum DigitalChannelTriggerStatesEnum {
    High = '1',
    Low = '0',
    Any = '*',
    Off = 'X',
}

export interface DataLoggerState {
    level: number;
    recordingLength: number;
    offsetLength: number;
    active: boolean;
    category: TriggerCategory;
    type: TriggerType;
    edge: TriggerEdge;
    progressMessage?: string;
    progress?: number;
    triggerOrigin?: number;
    digitalChannelsTriggerLogic: DigitalChannelTriggerLogic;
    digitalChannelsTriggersStates: digitalChannelStateTupleOf8;
}

const initialState = (): DataLoggerState => ({
    level: getPersistedTriggerLevel(1000),
    recordingLength: getPersistedRecordingLength(1000),
    offsetLength: getPersistedTriggerOffset(0),
    active: false,
    category: getPersistedTriggerCategory('Analog'),
    type: getPersistedTriggerType('Single'),
    edge: getPersistedTriggerEdge('Rising Edge'),
    digitalChannelsTriggerLogic: getPersistedDigitaTriggerLogic('AND'),
    digitalChannelsTriggersStates: getPersistedDigitalChannelsTriggers([
        'X',
        'X',
        'X',
        'X',
        'X',
        'X',
        'X',
        'X',
    ] as digitalChannelStateTupleOf8),
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
        setTriggerOffset: (state, action: PayloadAction<number>) => {
            state.offsetLength = action.payload;
            persistTriggerOffset(action.payload);
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
        setDigitalChannelsTriggerLogic: (
            state,
            action: PayloadAction<DigitalChannelTriggerLogic>
        ) => {
            state.digitalChannelsTriggerLogic = action.payload;
            persistDigitaTriggerLogic(action.payload);
        },
        setDigitalChannelsTriggersStates: (
            state,
            action: PayloadAction<{
                digitalChannelsTriggers: digitalChannelStateTupleOf8;
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
export const getTriggerOffset = (state: RootState) =>
    state.app.trigger.offsetLength;
export const getTriggerActive = (state: RootState) => state.app.trigger.active;
export const getTriggerCategory = (state: RootState) =>
    state.app.trigger.category;
export const getTriggerType = (state: RootState) => state.app.trigger.type;
export const getTriggerEdge = (state: RootState) => state.app.trigger.edge;
export const getDigitalChannelsTriggerLogic = (state: RootState) =>
    state.app.trigger.digitalChannelsTriggerLogic;
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
    setTriggerOffset,
    setTriggerActive,
    setTriggerCategory,
    setTriggerType,
    setTriggerEdge,
    setDigitalChannelsTriggerLogic,
    setDigitalChannelsTriggersStates,
    setProgress,
    clearProgress,
    setTriggerOrigin,
    resetTriggerOrigin,
} = triggerSlice.actions;

export default triggerSlice.reducer;
