/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    getVoltageRegulatorMaxCap,
    setVoltageRegulatorMaxCap,
} from '../utils/persistentStore';

const initialState = {
    vdd: 3000, // [1800 .. 3600] mV
    currentVDD: 3000,
    min: 1850,
    max: 3600,
    maxCap: getVoltageRegulatorMaxCap(5000),
};

const VOLTAGE_REGULATOR_UPDATED = 'VOLTAGE_REGULATOR_UPDATED';
const VOLTAGE_REGULATOR_MAX_CAP_UPDATED = 'VOLTAGE_REGULATOR_MAX_CAP_UPDATED';

export const updateRegulatorAction = ({ vdd, currentVDD, min, max }) => ({
    type: VOLTAGE_REGULATOR_UPDATED,
    vdd,
    currentVDD,
    min,
    max,
});

export const moveVoltageRegulatorVddAction = vdd =>
    updateRegulatorAction({ vdd });

export const updateVoltageRegulatorMaxCapAction = maxCap => ({
    type: VOLTAGE_REGULATOR_MAX_CAP_UPDATED,
    maxCap,
});

export default (state = initialState, action) => {
    switch (action.type) {
        case VOLTAGE_REGULATOR_UPDATED: {
            return {
                vdd: action.vdd || state.vdd,
                currentVDD: action.currentVDD || state.currentVDD,
                min: action.min || state.min,
                max: action.max || state.max,
                maxCap: state.maxCap || action.max,
            };
        }
        case VOLTAGE_REGULATOR_MAX_CAP_UPDATED: {
            setVoltageRegulatorMaxCap(action.maxCap);
            return {
                ...state,
                ...action,
            };
        }
        default:
    }
    return state;
};

export const voltageRegulatorState = ({ app }) => app.voltageRegulator;
