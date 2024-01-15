/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '../../slices/index';

interface ProgressState {
    message: string;
    title: string;
    progress: number;
    complete: boolean;
    show: boolean;
}

const initialState: ProgressState = {
    title: 'Loading...',
    message: '',
    progress: -1,
    complete: false,
    show: false,
};

const progressSlice = createSlice({
    name: 'progress',
    initialState,
    reducers: {
        showProgressDialog: (
            state,
            action: PayloadAction<{ title?: string; message: string }>
        ) => {
            state.title = action.payload.title ?? initialState.title;
            state.progress = -1;
            state.show = true;
            state.complete = false;
            state.message = action.payload.message;
        },
        closeProgressDialog: () => ({ ...initialState }),
        updateProgress: (
            state,
            action: PayloadAction<{ progress?: number; message: string }>
        ) => {
            state.message = action.payload.message;
            state.progress = action.payload.progress ?? -1;
        },
    },
});

export const getProgressDialogInfo = (state: RootState) =>
    state.app.progressDialog;

export const { showProgressDialog, closeProgressDialog, updateProgress } =
    progressSlice.actions;
export default progressSlice.reducer;
