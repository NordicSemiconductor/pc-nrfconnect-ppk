/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { currentPane } from '@nordicsemiconductor/pc-nrfconnect-shared';

import type { RootState } from '../slices';

export const SCOPE = 1;
export const DATA_LOGGER = 0;

export const isScopePane = (state: RootState) => currentPane(state) === SCOPE;
export const isDataLoggerPane = (state: RootState) =>
    currentPane(state) === DATA_LOGGER;
