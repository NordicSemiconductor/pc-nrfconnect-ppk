/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '.';

type GainsState = [number, number, number, number, number];

const initialState = (): GainsState => [100, 100, 100, 100, 100];

const gainsSlice = createSlice({
    name: 'gains',
    initialState: initialState(),
    reducers: {
        updateGainsAction: (
            state,
            action: PayloadAction<{ value?: number; range: number }>
        ) => {
            const value = action.payload.value || 100;

            return state.map((oldValue, range) =>
                range === action.payload.range ? value : oldValue
            ) as GainsState;
        },
        resetGainsToDefaults() {
            return initialState();
        },
    },
});

export const gainsState = (state: RootState) => state.app.gains;

export const { updateGainsAction, resetGainsToDefaults } = gainsSlice.actions;

export default gainsSlice.reducer;
