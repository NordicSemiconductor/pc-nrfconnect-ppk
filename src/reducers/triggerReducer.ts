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
    externalTrigger: boolean;
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
    externalTrigger: false,
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
            action: PayloadAction<{ triggerLevel: number }>
        ) {
            const { triggerLevel } = action.payload;
            return { ...state, triggerLevel };
        },
        triggerLengthSetAction(
            state,
            action: PayloadAction<{ triggerLength: number }>
        ) {
            const { triggerLength } = action.payload;
            return { ...state, triggerLength, trigggerWindowOffset: 0 };
        },
        toggleTriggerAction(
            state,
            action: PayloadAction<{ triggerRunning: boolean }>
        ) {
            const { triggerRunning } = action.payload;
            let { externalTrigger } = state;
            if (!triggerRunning) {
                externalTrigger = false;
            }
            return {
                ...state,
                triggerRunning,
                externalTrigger,
            };
        },
        setTriggerStartAction(
            state,
            action: PayloadAction<{ triggerStartIndex: number }>
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
        externalTriggerToggledAction(state) {
            const externalTrigger = !state.externalTrigger;
            let { triggerRunning, triggerSingleWaiting } = state;
            if (externalTrigger) {
                triggerRunning = false;
                triggerSingleWaiting = false;
            }
            return {
                ...state,
                externalTrigger,
                triggerRunning,
                triggerSingleWaiting,
            };
        },
        triggerWindowRangeAction(
            state,
            action: PayloadAction<{ min: number; max: number }>
        ) {
            const triggerWindowRange = action.payload;
            return { ...state, triggerWindowRange };
        },
        setWindowOffsetAction(
            state,
            action: PayloadAction<{ offset: number }>
        ) {
            const triggerWindowOffset = action.payload.offset;
            return { ...state, triggerWindowOffset };
        },
        setTriggerOriginAction(
            state,
            action: PayloadAction<{ origin: number }>
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
    externalTriggerToggledAction,
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
