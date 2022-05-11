/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const initialState = {
    resLo: 509.0,
    resMid: 28.0,
    resHi: 1.8,
    userResLo: 509.0,
    userResMid: 28.0,
    userResHi: 1.8,
};

const RESISTORS_RESET = 'RESISTORS_RESET';
const USER_RESISTOR_UPDATED = 'USER_RESISTOR_UPDATED';

const updateResistorAction = ({ userResHi, userResMid, userResLo }) => ({
    type: USER_RESISTOR_UPDATED,
    userResHi,
    userResMid,
    userResLo,
});

export const resistorsResetAction = ({
    resHi,
    resMid,
    resLo,
    userResHi,
    userResMid,
    userResLo,
} = {}) => ({
    type: RESISTORS_RESET,
    resHi,
    resMid,
    resLo,
    userResHi,
    userResMid,
    userResLo,
});

export const updateHighResistorAction = userResHi =>
    updateResistorAction({ userResHi });
export const updateMidResistorAction = userResMid =>
    updateResistorAction({ userResMid });
export const updateLowResistorAction = userResLo =>
    updateResistorAction({ userResLo });

const defined = (a, b) => (a !== undefined ? a : b);

// eslint-disable-next-line default-param-last
export default (state = initialState, action) => {
    switch (action.type) {
        case USER_RESISTOR_UPDATED: {
            return {
                ...state,
                userResHi: defined(action.userResHi, state.userResHi),
                userResMid: defined(action.userResMid, state.userResMid),
                userResLo: defined(action.userResLo, state.userResLo),
            };
        }
        case RESISTORS_RESET:
            return {
                userResHi: defined(action.userResHi, state.resHi),
                userResMid: defined(action.userResMid, state.resMid),
                userResLo: defined(action.userResLo, state.resLo),
                resHi: defined(action.resHi, state.resHi),
                resMid: defined(action.resMid, state.resMid),
                resLo: defined(action.resLo, state.resLo),
            };
        default:
            return state;
    }
};

export const resistorCalibrationState = ({ app }) => app.resistorCalibration;
