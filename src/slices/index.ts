/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { NrfConnectState } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { combineReducers } from 'redux';

import deprecatedDevices from '../features/DeprecatedDevice/DeprecatedDeviceSlice';
import minimap from '../features/minimap/minimapSlice';
import progressDialog from '../features/ProgressDialog/progressSlice';
import app from './appSlice';
import chart from './chartSlice';
import dataLogger from './dataLoggerSlice';
import gains from './gainsSlice';
import spikeFilter from './spikeFilterSlice';
import trigger from './triggerSlice';
import voltageRegulator from './voltageRegulatorSlice';

type AppState = ReturnType<typeof appReducer>;

export type RootState = NrfConnectState<AppState>;

const appReducer = combineReducers({
    app,
    chart,
    minimap,
    voltageRegulator,
    gains,
    spikeFilter,
    dataLogger,
    deprecatedDevices,
    progressDialog,
    trigger,
});

export default appReducer;
