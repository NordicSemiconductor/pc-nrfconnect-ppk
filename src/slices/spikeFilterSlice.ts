/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { getSpikeFilter } from '../utils/persistentStore';
import type { RootState } from '.';

interface SpikeFilter {
    samples: number;
    alpha: number;
    alpha5: number;
}

const defaultState = (): SpikeFilter => ({
    samples: 3,
    alpha: 0.18,
    alpha5: 0.06,
});

const spikeFilterSlice = createSlice({
    name: 'spikeFilter',
    initialState: getSpikeFilter(defaultState()),
    reducers: {
        updateSpikeFilterAction(
            state,
            action: PayloadAction<{ spikeFilter: Partial<SpikeFilter> }>
        ) {
            return { ...state, ...action.payload.spikeFilter };
        },
        resetSpikeFilterToDefaults() {
            return { ...defaultState() };
        },
    },
});

export const spikeFilterState = (state: RootState) => state.app.spikeFilter;

export const { updateSpikeFilterAction, resetSpikeFilterToDefaults } =
    spikeFilterSlice.actions;

export default spikeFilterSlice.reducer;
