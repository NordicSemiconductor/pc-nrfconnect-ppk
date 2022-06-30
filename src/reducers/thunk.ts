/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { AnyAction } from 'redux';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';

import type { RootState } from '.';

export type TAction = ThunkAction<void, RootState, null, AnyAction>;
export type TDispatch = ThunkDispatch<RootState, null, AnyAction>;
