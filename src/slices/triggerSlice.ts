/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '.';

interface TriggerState {
    triggerLevel: null | number; // [microAmp]
    triggerSingleWaiting: boolean;
    triggerRunning: boolean;
    triggerLength: number;
    triggerWindowRange: {
        min: number;
        max: number;
    };
    triggerStartIndex: null | number;
    triggerWindowOffset: number;
    triggerOrigin: null | number;
}

const initialState = (): TriggerState => ({
    triggerLevel: null, // [microAmp]
    triggerSingleWaiting: false,
    triggerRunning: false,
    triggerLength: 0,
    triggerWindowRange: {
        min: (450 * 13) / 1e3,
        max: (4000 * 13) / 1e3,
    },
    triggerStartIndex: null,
    triggerWindowOffset: 0,
    triggerOrigin: null,
});

const triggerSlice = createSlice({
    name: 'trigger',
    initialState: initialState(),
    reducers: {
        triggerLevelSetAction(
            state,
            action: PayloadAction<{ triggerLevel: number | null }>
        ) {
            const { triggerLevel } = action.payload;
            return { ...state, triggerLevel };
        },
        triggerLengthSetAction(
            state,
            action: PayloadAction<{ triggerLength: number }>
        ) {
            const { triggerLength } = action.payload;
            return { ...state, triggerLength, triggerWindowOffset: 0 };
        },
        toggleTriggerAction(
            state,
            action: PayloadAction<{ triggerRunning: boolean }>
        ) {
            const { triggerRunning } = action.payload;
            return {
                ...state,
                triggerRunning,
            };
        },
        setTriggerStartAction(
            state,
            action: PayloadAction<{ triggerStartIndex: number | null }>
        ) {
            const { triggerStartIndex } = action.payload;
            return { ...state, triggerStartIndex };
        },
        triggerSingleSetAction(state) {
            return {
                ...state,
                triggerSingleWaiting: true,
                triggerRunning: false,
            };
        },
        clearSingleTriggerWaitingAction(state) {
            return { ...state, triggerSingleWaiting: false };
        },
        triggerWindowRangeAction(
            state,
            action: PayloadAction<{ min: number; max: number }>
        ) {
            const triggerWindowRange = action.payload;
            return { ...state, triggerWindowRange };
        },
        setWindowOffsetAction(state, action: PayloadAction<number>) {
            const triggerWindowOffset = action.payload;
            return { ...state, triggerWindowOffset };
        },
        setTriggerOriginAction(
            state,
            action: PayloadAction<{ origin: number | null }>
        ) {
            const triggerOrigin = action.payload.origin;
            return { ...state, triggerOrigin };
        },
        setTriggerState(state) {
            return { ...state };
        },
        completeTriggerAction(
            state,
            action: PayloadAction<{ origin: number }>
        ) {
            const triggerOrigin = action.payload.origin;
            const triggerStartIndex = null;
            return { ...state, triggerOrigin, triggerStartIndex };
        },
    },
});

export const triggerState = (state: RootState) => state.app.trigger;

export const {
    clearSingleTriggerWaitingAction,
    completeTriggerAction,
    setTriggerOriginAction,
    setTriggerStartAction,
    setTriggerState,
    setWindowOffsetAction,
    toggleTriggerAction,
    triggerLengthSetAction,
    triggerLevelSetAction,
    triggerSingleSetAction,
    triggerWindowRangeAction,
} = triggerSlice.actions;

export default triggerSlice.reducer;
