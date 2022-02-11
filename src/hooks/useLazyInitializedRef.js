/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { useRef } from 'react';

const uninitialisedToken = Symbol('uninitialisedToken');

export const useLazyInitializedRef = initialiser => {
    const ref = useRef(uninitialisedToken);
    if (ref.current === uninitialisedToken) {
        ref.current = initialiser();
    }
    return ref;
};
