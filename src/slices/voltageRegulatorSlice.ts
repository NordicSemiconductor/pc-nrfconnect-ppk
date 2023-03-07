/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO: Remove, only added for conservative refactoring to typescript */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    getVoltageRegulatorMaxCap,
    setVoltageRegulatorMaxCap,
} from '../utils/persistentStore';
import type { RootState } from '.';

interface VoltageRegulatorState {
    vdd: number;
    currentVDD: number;
    min: number;
    max: number;
    maxCap: number;
}

const initialState = (): VoltageRegulatorState => ({
    vdd: 3000, // [1800 .. 3600] mV
    currentVDD: 3000,
    min: 1850,
    max: 3600,
    maxCap: getVoltageRegulatorMaxCap(5000),
});

const voltageRegulatorSlice = createSlice({
    name: 'voltageRegulator',
    initialState: initialState(),
    reducers: {
        updateRegulatorAction(
            state,
            action: PayloadAction<{
                vdd?: number;
                currentVDD?: number;
                min?: number;
                max?: number;
            }>
        ) {
            return {
                vdd: action.payload.vdd || state.vdd,
                currentVDD: action.payload.currentVDD || state.currentVDD,
                min: action.payload.min || state.min,
                max: action.payload.max || state.max,
                maxCap: state.maxCap || action.payload.max!,
            };
        },
        moveVoltageRegulatorVddAction(
            state,
            action: PayloadAction<{ vdd: number }>
        ) {
            const { vdd } = action.payload;
            return { ...state, vdd };
        },
        updateVoltageRegulatorMaxCapAction(
            state,
            action: PayloadAction<{ maxCap: number }>
        ) {
            const { maxCap } = action.payload;
            setVoltageRegulatorMaxCap(maxCap);
            return { ...state, maxCap };
        },
        resetVoltageMaxCapForPPK1(state) {
            state.maxCap = 3600;
        },
    },
});

export const voltageRegulatorState = (state: RootState) =>
    state.app.voltageRegulator;

export const {
    moveVoltageRegulatorVddAction,
    updateRegulatorAction,
    updateVoltageRegulatorMaxCapAction,
    resetVoltageMaxCapForPPK1,
} = voltageRegulatorSlice.actions;

export default voltageRegulatorSlice.reducer;
