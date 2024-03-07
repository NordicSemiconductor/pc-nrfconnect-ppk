/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { useRef } from 'react';

import {
    DataAccumulator,
    DataAccumulatorInitialiser,
} from '../components/Chart/data/dataAccumulator';

const uninitialisedToken = Symbol('uninitialisedToken');

export type DataAccumulatorInstance =
    | DataAccumulator
    | typeof uninitialisedToken;

export const useLazyInitializedRef = (
    initialiser: DataAccumulatorInitialiser
) => {
    const ref = useRef<DataAccumulator | typeof uninitialisedToken>(
        uninitialisedToken
    );
    if (ref.current === uninitialisedToken) {
        ref.current = initialiser();
    }
    return ref;
};

export const isInitialised = (
    processor: DataAccumulator | typeof uninitialisedToken
): processor is DataAccumulator => processor !== uninitialisedToken;
