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
import {
    DataSelector,
    DataSelectorInitialiser,
} from '../components/Chart/data/dataSelector';

const uninitialisedToken = Symbol('uninitialisedToken');

export const useLazyInitializedRef = (
    initialiser: DataAccumulatorInitialiser | DataSelectorInitialiser
) => {
    const ref = useRef<
        DataAccumulator | DataSelector | typeof uninitialisedToken
    >(uninitialisedToken);
    if (ref.current === uninitialisedToken) {
        ref.current = initialiser();
    }
    return ref;
};

export const isInitialised = (
    processor: DataAccumulator | DataSelector | typeof uninitialisedToken
): processor is DataAccumulator | DataSelector =>
    processor !== uninitialisedToken;
