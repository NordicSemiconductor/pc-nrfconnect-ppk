/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { currentPane } from 'pc-nrfconnect-shared';

import { RootState } from '../slices';

export const REAL_TIME = 1;
export const DATA_LOGGER = 0;

export const isRealTimePane = (state: RootState) =>
    currentPane(state) === REAL_TIME;
export const isDataLoggerPane = (state: RootState) =>
    currentPane(state) === DATA_LOGGER;

export const paneName = (state: RootState) =>
    isRealTimePane(state) ? 'real-time' : 'data-logger';
