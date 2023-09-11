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
            { payload: triggerLevel }: PayloadAction<number | null>
        ) {
            state.triggerLevel = triggerLevel;
        },
        triggerLengthSetAction(
            state,
            { payload: triggerLength }: PayloadAction<number>
        ) {
            state.triggerLength = triggerLength;
            state.triggerWindowOffset = 0;
        },
        toggleTriggerAction(
            state,
            { payload: triggerRunning }: PayloadAction<boolean>
        ) {
            state.triggerRunning = triggerRunning;
        },
        setTriggerStartAction(
            state,
            { payload: triggerStartIndex }: PayloadAction<number | null>
        ) {
            state.triggerStartIndex = triggerStartIndex;
        },
        triggerSingleSetAction(state) {
            state.triggerSingleWaiting = true;
            state.triggerRunning = false;
        },
        clearSingleTriggerWaitingAction(state) {
            state.triggerSingleWaiting = false;
        },
        triggerWindowRangeAction(
            state,
            {
                payload: triggerWindowRange,
            }: PayloadAction<{ min: number; max: number }>
        ) {
            state.triggerWindowRange = triggerWindowRange;
        },
        setWindowOffsetAction(
            state,
            { payload: triggerWindowOffset }: PayloadAction<number>
        ) {
            state.triggerWindowOffset = triggerWindowOffset;
        },
        setTriggerOriginAction(
            state,
            { payload: triggerOrigin }: PayloadAction<number | null>
        ) {
            state.triggerOrigin = triggerOrigin;
        },
        setTriggerState(
            _state,
            { payload: newState }: PayloadAction<TriggerState>
        ) {
            return newState;
        },
        completeTriggerAction(
            state,
            { payload: triggerOrigin }: PayloadAction<number>
        ) {
            state.triggerOrigin = triggerOrigin;
            state.triggerStartIndex = null;
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
