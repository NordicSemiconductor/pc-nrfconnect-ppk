/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { useRef } from 'react';

const uninitialisedToken = Symbol('uninitialisedToken');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: figure out type of initialiser
export const useLazyInitializedRef = (initialiser: any) => {
    const ref = useRef(uninitialisedToken);
    if (ref.current === uninitialisedToken) {
        ref.current = initialiser();
    }
    return ref;
};
