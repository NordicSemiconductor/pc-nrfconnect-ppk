/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable import/first */

jest.mock('../../actions/deviceActions', () => ({
    PPK_METADATA: 'PPK_METADATA',
    RESISTORS_RESET: 'RESISTORS_RESET',
}));

import reducer from '../resistorCalibrationSlice';

const initialState = reducer(undefined, {});

describe('resistorCalibrationReducer', () => {
    it('should not update user resistor values if they are undefined', () => {
        const state = reducer(initialState, {
            type: 'USER_RESISTOR_UPDATED',
            userResHi: undefined,
            userResMid: undefined,
            userResLo: undefined,
        });
        expect(state.userResHi).toEqual(initialState.userResHi);
        expect(state.userResMid).toEqual(initialState.userResMid);
        expect(state.userResLo).toEqual(initialState.userResLo);
    });
});
