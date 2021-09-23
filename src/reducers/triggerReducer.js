/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const initialState = {
    triggerLevel: null, // [microAmp]
    triggerSingleWaiting: false,
    triggerRunning: false,
    externalTrigger: false,
    triggerLength: 0,
    triggerWindowRange: {
        min: (450 * 13) / 1e3,
        max: (4000 * 13) / 1e3,
    },
    triggerStartIndex: null,
    triggerWindowOffset: 0,
    triggerOrigin: null,
};

export const EXTERNAL_TRIGGER_TOGGLE = 'EXTERNAL_TRIGGER_TOGGLE';
export const TRIGGER_SINGLE_CLEAR = 'TRIGGER_SINGLE_CLEAR';
export const TRIGGER_SINGLE_SET = 'TRIGGER_SINGLE_SET';
export const TRIGGER_TOGGLE = 'TRIGGER_TOGGLE';
export const TRIGGER_LEVEL_SET = 'TRIGGER_LEVEL_SET';
export const TRIGGER_LENGTH_SET = 'TRIGGER_LENGTH_SET';
export const TRIGGER_WINDOW_RANGE = 'TRIGGER_WINDOW_RANGE';
export const SET_TRIGGER_START = 'SET_TRIGGER_START';
export const SET_WINDOW_OFFSET = 'SET_WINDOW_OFFSET';
export const SET_TRIGGER_ORIGIN = 'SET_TRIGGER_ORIGIN';
export const LOAD_TRIGGER_STATE = 'LOAD_TRIGGER_STATE';
export const TRIGGER_COMPLETE = 'TRIGGER_COMPLETE';

export const triggerLevelSetAction = triggerLevel => ({
    type: TRIGGER_LEVEL_SET,
    triggerLevel,
});

export const triggerLengthSetAction = triggerLength => ({
    type: TRIGGER_LENGTH_SET,
    triggerLength,
});

export const toggleTriggerAction = triggerRunning => ({
    type: TRIGGER_TOGGLE,
    triggerRunning,
});

export const setTriggerStartAction = triggerStartIndex => ({
    type: SET_TRIGGER_START,
    triggerStartIndex,
});

export const triggerSingleSetAction = () => ({ type: TRIGGER_SINGLE_SET });
export const clearSingleTriggerWaitingAction = () => ({
    type: TRIGGER_SINGLE_CLEAR,
});
export const externalTriggerToggledAction = () => ({
    type: EXTERNAL_TRIGGER_TOGGLE,
});

export const triggerWindowRangeAction = ({ min, max }) => ({
    type: TRIGGER_WINDOW_RANGE,
    triggerWindowRange: { min, max },
});

export const setWindowOffsetAction = offset => ({
    type: SET_WINDOW_OFFSET,
    offset,
});

export const setTriggerOriginAction = origin => ({
    type: SET_TRIGGER_ORIGIN,
    origin,
});

export const setTriggerState = state => ({
    type: LOAD_TRIGGER_STATE,
    ...state,
});

export const completeTriggerAction = origin => ({
    type: TRIGGER_COMPLETE,
    origin,
    triggerStartIndex: null,
});

export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case TRIGGER_SINGLE_SET: {
            return {
                ...state,
                triggerSingleWaiting: true,
                triggerRunning: false,
            };
        }

        case TRIGGER_SINGLE_CLEAR: {
            return {
                ...state,
                triggerSingleWaiting: false,
            };
        }
        case TRIGGER_TOGGLE: {
            let { externalTrigger } = state;
            const { triggerRunning } = action;
            if (!triggerRunning) {
                externalTrigger = false;
            }
            return {
                ...state,
                triggerRunning,
                externalTrigger,
            };
        }
        case EXTERNAL_TRIGGER_TOGGLE: {
            const externalTrigger = !state.externalTrigger;
            let { triggerRunning, triggerSingleWaiting } = state;
            if (externalTrigger) {
                triggerRunning = false;
                triggerSingleWaiting = false;
            }
            return {
                ...state,
                externalTrigger,
                triggerRunning,
                triggerSingleWaiting,
            };
        }
        case SET_TRIGGER_START:
            return {
                ...state,
                triggerStartIndex: action.triggerStartIndex,
            };
        case SET_WINDOW_OFFSET:
            return {
                ...state,
                triggerWindowOffset: action.offset,
            };
        case TRIGGER_LENGTH_SET: {
            return { ...state, ...action, triggerWindowOffset: 0 };
        }
        case SET_TRIGGER_ORIGIN: {
            return { ...state, triggerOrigin: action.origin };
        }
        case TRIGGER_COMPLETE: {
            return {
                ...state,
                triggerOrigin: action.origin,
                triggerStartIndex: action.triggerStartIndex,
            };
        }
        case LOAD_TRIGGER_STATE: {
            return { ...state, ...action };
        }
        case TRIGGER_LEVEL_SET:
        case TRIGGER_WINDOW_RANGE: {
            return { ...state, ...action };
        }
        default:
    }
    return state;
};

export const triggerState = ({ app }) => app.trigger;
