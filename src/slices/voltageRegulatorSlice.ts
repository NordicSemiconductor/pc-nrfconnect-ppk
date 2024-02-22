/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    getVoltageRegulatorMaxCapPPK2,
    setVoltageRegulatorMaxCapPPK2 as persistVoltageRegulatorMaxCapPPK2,
} from '../utils/persistentStore';
import type { RootState } from '.';

interface VoltageRegulatorState {
    vdd: number;
    currentVDD: number;
    min: number;
    max: number;
    maxCap: number;
    maxCapPPK2: number;
}

const maxCapPPK2 = 5000;
const initialState = (): VoltageRegulatorState => ({
    vdd: 3000, // [1800 .. 3600] mV
    currentVDD: 3000,
    min: 1850,
    max: 3600,
    maxCap: getVoltageRegulatorMaxCapPPK2(maxCapPPK2),
    maxCapPPK2: getVoltageRegulatorMaxCapPPK2(maxCapPPK2),
});

const voltageRegulatorSlice = createSlice({
    name: 'voltageRegulator',
    initialState: initialState(),
    reducers: {
        updateRegulator(
            state,
            {
                payload: { vdd, currentVDD, min, max },
            }: PayloadAction<{
                vdd?: number;
                currentVDD?: number;
                min?: number;
                max?: number;
            }>
        ) {
            state.vdd = vdd || state.vdd;
            state.currentVDD = currentVDD || state.currentVDD;
            state.min = min || state.min;
            state.max = max || state.max;
            // state.maxCap = state.maxCapPPK2 || max!;
        },
        moveVoltageRegulatorVdd(
            state,
            { payload: vdd }: PayloadAction<number>
        ) {
            state.vdd = vdd;
        },

        updateVoltageRegulatorMaxCapPPK2(
            state,
            { payload: newMaxCap }: PayloadAction<number>
        ) {
            persistVoltageRegulatorMaxCapPPK2(newMaxCap);
            state.maxCap = newMaxCap;
            state.maxCapPPK2 = newMaxCap;
        },
        resetVoltageRegulatorMaxCapPPK2(state) {
            persistVoltageRegulatorMaxCapPPK2(maxCapPPK2);
            state.maxCap = maxCapPPK2;
            state.maxCapPPK2 = maxCapPPK2;
        },
    },
});

export const voltageRegulatorState = (state: RootState) =>
    state.app.voltageRegulator;

export const {
    updateRegulator,
    moveVoltageRegulatorVdd,
    updateVoltageRegulatorMaxCapPPK2,
    resetVoltageRegulatorMaxCapPPK2,
} = voltageRegulatorSlice.actions;

export default voltageRegulatorSlice.reducer;
