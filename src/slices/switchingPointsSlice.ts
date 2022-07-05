/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '.';
import { TAction } from './thunk';

interface SwitchingPoints {
    switchUpHigh: number;
    switchUpLow: number;
    switchDownHigh: number;
    switchDownLow: number;
    enableSwitchFilter: boolean;
    vrefHigh: number;
    vrefLow: number;
    switchUpSliderPosition: number;
    switchDownSliderPosition: number;
    spikeFiltering: boolean;
}

const initialState = (): SwitchingPoints => ({
    switchUpHigh: 1.82,
    switchUpLow: 100,
    switchDownHigh: 0.06,
    switchDownLow: 1.54,
    enableSwitchFilter: true,
    vrefHigh: 25000,
    vrefLow: 25000,
    switchUpSliderPosition: 50,
    switchDownSliderPosition: 300,
    spikeFiltering: true,
});

const switchingPointsSlice = createSlice({
    name: 'switchingPoints',
    initialState: initialState(),
    reducers: {
        switchingPointsResetAction(
            state,
            action: PayloadAction<{
                vrefHigh: number;
                vrefLow: number;
            }>
        ) {
            const vrefHigh = action.payload.vrefHigh || state.vrefHigh;
            const vrefLow = action.payload.vrefLow || state.vrefLow;

            const switchUpSliderPosition =
                ((vrefHigh * 2) / 27000 + 1) * (0.41 / 10.98194) * 1000;

            // In converting to typescript I found that parseInt is suppose to take a string
            // and decided to avoid parsing the float to a string and then back to integer.
            // Since the docs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
            // Says that it effectively truncates the decimals, I decided to floor the value instead.
            const switchDownSliderPosition =
                500 -
                Math.floor((((vrefLow * 2 + 30000) / 2000.0 + 1) / 16.3) * 100);

            const { switchUpLow, switchUpHigh } = calculateSwitchingPointsUp(
                switchUpSliderPosition
            );
            const { switchDownHigh, switchDownLow } =
                calculateSwitchingPointsDown(
                    switchDownSliderPosition,
                    switchUpHigh,
                    state.switchUpSliderPosition
                );

            return {
                ...state,
                vrefHigh,
                vrefLow,
                switchUpSliderPosition,
                switchDownSliderPosition,
                switchUpLow,
                switchUpHigh,
                switchDownHigh,
                switchDownLow,
            };
        },
        switchingPointsDownSetAction(
            state,
            action: PayloadAction<{ sliderValue: number }>
        ) {
            const { switchDownHigh, switchDownLow } =
                calculateSwitchingPointsDown(
                    action.payload.sliderValue,
                    state.switchUpHigh,
                    state.switchUpSliderPosition
                );
            return {
                ...state,
                switchDownHigh,
                switchDownLow,
            };
        },
        switchingPointUpMovedAction(
            state,
            action: PayloadAction<{ sliderValue: number }>
        ) {
            const { switchUpLow, switchUpHigh } = calculateSwitchingPointsUp(
                action.payload.sliderValue
            );
            return {
                ...state,
                switchUpLow,
                switchUpHigh,
                switchUpSliderPosition: action.payload.sliderValue,
            };
        },
        switchingPointDownMovedAction(
            state,
            action: PayloadAction<{ sliderValue: number }>
        ) {
            const { switchDownHigh, switchDownLow } =
                calculateSwitchingPointsDown(
                    action.payload.sliderValue,
                    state.switchUpHigh,
                    state.switchUpSliderPosition
                );
            return {
                ...state,
                switchDownHigh,
                switchDownLow,
                switchDownSliderPosition: action.payload.sliderValue,
            };
        },
        spikeFilteringToggleAction(state) {
            return {
                ...state,
                spikeFiltering: !state.spikeFiltering,
            };
        },
    },
});

export const switchingPointUpMoved =
    (sliderValue: number): TAction =>
    (dispatch, getState) => {
        dispatch(switchingPointUpMovedAction({ sliderValue }));
        dispatch(
            switchingPointDownMovedAction({
                sliderValue: switchingPointsState(getState())
                    .switchDownSliderPosition,
            })
        );
    };

function calculateSwitchingPointsUp(sliderVal: number) {
    return {
        switchUpLow: (sliderVal / 510.0) * 1000, // RES_LOW
        switchUpHigh: sliderVal / 28.0, // RES_MID
    };
}

function calculateSwitchingPointsDown(
    sliderValue: number,
    switchUpHigh: number,
    switchUpSliderPosition: number
) {
    const hysteresis = (500 - sliderValue) / 100.0;
    const temp = switchUpSliderPosition;
    const switchDownHigh = switchUpHigh / 16.3 / hysteresis;

    const switchDownLow = temp / 16.3 / hysteresis;

    return {
        switchDownHigh,
        switchDownLow,
    };
}

export const switchingPointsState = (state: RootState) =>
    state.app.switchingPoints;

export const {
    spikeFilteringToggleAction,
    switchingPointDownMovedAction,
    switchingPointUpMovedAction,
    switchingPointsDownSetAction,
    switchingPointsResetAction,
} = switchingPointsSlice.actions;

export default switchingPointsSlice.reducer;
