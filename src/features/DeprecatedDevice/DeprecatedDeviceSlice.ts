/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '../../slices';

interface Startup {
    showPPK1Dialog: boolean;
}

const initialState = (): Startup => ({
    showPPK1Dialog: false,
});

const deprecatedDeviceSlice = createSlice({
    name: 'deprecatedDevices',
    initialState: initialState(),
    reducers: {
        setShowPPK1Dialog: (state, action: PayloadAction<boolean>) => {
            state.showPPK1Dialog = action.payload;
        },
    },
});

export const getShowPPK1Dialog = (state: RootState) =>
    state.app.deprecatedDevices.showPPK1Dialog;

export const { setShowPPK1Dialog } = deprecatedDeviceSlice.actions;

export default deprecatedDeviceSlice.reducer;
