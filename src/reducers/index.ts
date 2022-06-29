/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { NrfConnectState } from 'pc-nrfconnect-shared';
import { combineReducers } from 'redux';

import app from './appReducer';
import chart from './chartReducer';
import dataLogger from './dataLoggerReducer';
import gains from './gainsReducer';
import resistorCalibration from './resistorCalibrationReducer';
import spikeFilter from './spikeFilterReducer';
import switchingPoints from './switchingPointsReducer';
import trigger from './triggerReducer';
import voltageRegulator from './voltageRegulatorReducer';

type AppState = ReturnType<typeof appReducer>;

export type RootState = NrfConnectState<AppState>;

const appReducer = combineReducers({
    app,
    chart,
    trigger,
    switchingPoints,
    voltageRegulator,
    resistorCalibration,
    gains,
    spikeFilter,
    dataLogger,
});

export default appReducer;
