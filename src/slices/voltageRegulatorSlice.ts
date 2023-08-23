/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    getVoltageRegulatorMaxCapPPK1,
    getVoltageRegulatorMaxCapPPK2,
    setVoltageRegulatorMaxCapPPK1 as persistVoltageRegulatorMaxCapPPK1,
    setVoltageRegulatorMaxCapPPK2 as persistVoltageRegulatorMaxCapPPK2,
} from '../utils/persistentStore';
import type { RootState } from '.';

interface VoltageRegulatorState {
    vdd: number;
    currentVDD: number;
    min: number;
    max: number;
    maxCap: number;
    maxCapPPK1: number;
    maxCapPPK2: number;
}

const initialState = (): VoltageRegulatorState => ({
    vdd: 3000, // [1800 .. 3600] mV
    currentVDD: 3000,
    min: 1850,
    max: 3600,
    maxCap: getVoltageRegulatorMaxCapPPK2(5000),
    maxCapPPK1: getVoltageRegulatorMaxCapPPK1(3600),
    maxCapPPK2: getVoltageRegulatorMaxCapPPK2(5000),
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
        updateMaxCapOnDeviceSelected(
            state,
            {
                payload: { isRTTDevice },
            }: PayloadAction<{ isRTTDevice: boolean }>
        ) {
            state.maxCap =
                isRTTDevice === true ? state.maxCapPPK1 : state.maxCapPPK2;
        },
        moveVoltageRegulatorVdd(
            state,
            { payload: vdd }: PayloadAction<number>
        ) {
            state.vdd = vdd;
        },
        updateVoltageRegulatorMaxCapPPK1(
            state,
            { payload: newMaxCap }: PayloadAction<number>
        ) {
            persistVoltageRegulatorMaxCapPPK1(newMaxCap);
            state.maxCap = newMaxCap;
            state.maxCapPPK2 = newMaxCap;
        },

        updateVoltageRegulatorMaxCapPPK2(
            state,
            { payload: newMaxCap }: PayloadAction<number>
        ) {
            persistVoltageRegulatorMaxCapPPK2(newMaxCap);
            state.maxCap = newMaxCap;
            state.maxCapPPK2 = newMaxCap;
        },
    },
});

export const voltageRegulatorState = (state: RootState) =>
    state.app.voltageRegulator;

export const {
    updateRegulator,
    updateMaxCapOnDeviceSelected,
    moveVoltageRegulatorVdd,
    updateVoltageRegulatorMaxCapPPK1,
    updateVoltageRegulatorMaxCapPPK2,
} = voltageRegulatorSlice.actions;

export default voltageRegulatorSlice.reducer;
