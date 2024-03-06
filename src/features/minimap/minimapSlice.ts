/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { AppThunk } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { DataManager } from '../../globals';
import type { RootState } from '../../slices/index';

interface MinimapState {
    showMinimap: boolean;
    xAxisMaxTime: number;
    triggerForceRerender: boolean;
}

const initialState: MinimapState = {
    showMinimap: true,
    xAxisMaxTime: 0,
    triggerForceRerender: false,
};

const minimapSlice = createSlice({
    name: 'minimap',
    initialState,
    reducers: {
        setShowMinimap: (state, { payload: show }: PayloadAction<boolean>) => {
            state.showMinimap = show;
        },
        miniMapAnimationAction: state => {
            state.xAxisMaxTime = DataManager().getTimestamp();
        },
        resetMinimap: state => {
            state.xAxisMaxTime = 0;
        },
        triggerForceRerender: state => {
            state.triggerForceRerender = !state.triggerForceRerender;
        },
    },
});

export const setShowMinimapAction =
    (showMinimap: boolean): AppThunk<RootState> =>
    dispatch => {
        dispatch(setShowMinimap(showMinimap));
    };

export const showMinimap = (state: RootState) => state.app.minimap.showMinimap;
export const getForceRerender = (state: RootState) =>
    state.app.minimap.triggerForceRerender;
export const getXAxisMaxTime = (state: RootState) =>
    state.app.minimap.xAxisMaxTime;
export const {
    setShowMinimap,
    miniMapAnimationAction,
    resetMinimap,
    triggerForceRerender,
} = minimapSlice.actions;
export default minimapSlice.reducer;
