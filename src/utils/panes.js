/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { currentPane } from 'pc-nrfconnect-shared';

export const REAL_TIME = 1;
export const DATA_LOGGER = 0;

export const isRealTimePane = state => currentPane(state) === REAL_TIME;
export const isDataLoggerPane = state => currentPane(state) === DATA_LOGGER;

export const paneName = state =>
    isRealTimePane(state) ? 'real-time' : 'data-logger';
