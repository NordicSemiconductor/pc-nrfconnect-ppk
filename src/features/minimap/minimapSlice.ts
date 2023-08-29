/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { isDataLoggerPane } from '../utils/panes';
import type { RootState } from '.';
import type { TAction } from './thunk';

interface MinimapState {
    showMinimap: boolean;
}

const initialState: MinimapState = {
    showMinimap: false,
};

const minimapSlice = createSlice({
    name: 'minimap',
    initialState,
    reducers: {
        setShowMinimap: (state, { payload: show }: PayloadAction<boolean>) => {
            state.showMinimap = show;
        },
    },
});

export const setShowMinimapAction =
    (showMinimap: boolean): TAction =>
    (dispatch, getState) => {
        console.count('setShowMinimapAction');
        const isInDataLoggerPane = isDataLoggerPane(getState());

        if (!isInDataLoggerPane) {
            dispatch(setShowMinimap(false));
            return;
        }

        dispatch(setShowMinimap(showMinimap));
    };

export const showMinimap = (state: RootState) => state.app.minimap.showMinimap;
export const { setShowMinimap } = minimapSlice.actions;
export default minimapSlice.reducer;
