/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '.';

interface ResistorCalibrationState {
    resLo: number;
    resMid: number;
    resHi: number;
    userResLo: number;
    userResMid: number;
    userResHi: number;
}

const initialState = (): ResistorCalibrationState => ({
    resLo: 509.0,
    resMid: 28.0,
    resHi: 1.8,
    userResLo: 509.0,
    userResMid: 28.0,
    userResHi: 1.8,
});

const defined = (a: undefined | number, b: number) => (a !== undefined ? a : b);

const resistorCalibrationSlice = createSlice({
    name: 'resistorCalibration',
    initialState: initialState(),
    reducers: {
        updateResistorAction: (
            state,
            action: PayloadAction<{
                userResHi: number;
                userResMid: number;
                userResLo: number;
            }>
        ) => {
            const { userResHi, userResMid, userResLo } = action.payload;
            state.userResHi = defined(userResHi, state.userResHi);
            state.userResMid = defined(userResMid, state.userResMid);
            state.userResLo = defined(userResLo, state.userResLo);
            return { ...state };
        },
        resistorsResetAction: (
            state,
            action: PayloadAction<{
                resHi: number;
                resMid: number;
                resLo: number;
                userResHi: number;
                userResMid: number;
                userResLo: number;
            }>
        ) => ({
            ...state,
            userResHi: defined(action.payload.userResHi, state.resHi),
            userResMid: defined(action.payload.userResMid, state.resMid),
            userResLo: defined(action.payload.userResLo, state.resLo),
            resHi: defined(action.payload.resHi, state.resHi),
            resMid: defined(action.payload.resMid, state.resMid),
            resLo: defined(action.payload.resLo, state.resLo),
        }),
        updateHighResistorAction: (
            state,
            action: PayloadAction<{ userResHi: number }>
        ) => {
            state.userResHi = defined(
                action.payload.userResHi,
                state.userResHi
            );
        },
        updateMidResistorAction: (
            state,
            action: PayloadAction<{ userResMid: number }>
        ) => {
            state.userResMid = defined(
                action.payload.userResMid,
                state.userResMid
            );
        },
        updateLowResistorAction: (
            state,
            action: PayloadAction<{ userResLo: number }>
        ) => {
            state.userResLo = defined(
                action.payload.userResLo,
                state.userResLo
            );
        },
    },
});

export const resistorCalibrationState = (state: RootState) =>
    state.app.resistorCalibration;

export const {
    resistorsResetAction,
    updateHighResistorAction,
    updateLowResistorAction,
    updateMidResistorAction,
    updateResistorAction,
} = resistorCalibrationSlice.actions;

export default resistorCalibrationSlice.reducer;
