/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const initialState = [100, 100, 100, 100, 100];

const GAINS_UPDATE = 'GAINS_UPDATE';

export const updateGainsAction = (value, range) => ({
    type: GAINS_UPDATE,
    value: value || 100,
    range,
});

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case GAINS_UPDATE: {
            state.splice(action.range, 1, action.value);
            return [...state];
        }
        default:
            return state;
    }
};

export const gainsState = ({ app }) => app.gains;
