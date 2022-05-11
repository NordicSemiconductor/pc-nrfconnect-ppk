/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const initialState = {
    switchUpHigh: 1.82,
    switchUpLow: 100,
    switchDownHigh: 0.06,
    switchDownLow: 1.54,
    enableSwitchFilter: true,
    vrefHigh: 25000,
    vrefLow: 25000,
    switchUpSliderPosition: 50,
    switchDownSliderPosition: 300,
    spikeFiltering: true,
};

const SPIKE_FILTER_TOGGLE = 'SPIKE_FILTER_TOGGLE';
const SWITCHING_POINTS_DOWN_MOVE = 'SWITCHING_POINTS_DOWN_MOVE';
const SWITCHING_POINTS_DOWN_SET = 'SWITCHING_POINTS_DOWN_SET';
const SWITCHING_POINTS_RESET = 'SWITCHING_POINTS_RESET';
const SWITCHING_POINTS_UP_MOVE = 'SWITCHING_POINTS_UP_MOVE';

export const switchingPointsResetAction = ({ vrefHigh, vrefLow } = {}) => ({
    type: SWITCHING_POINTS_RESET,
    vrefHigh,
    vrefLow,
});

export const switchingPointsDownSetAction = sliderVal => ({
    type: SWITCHING_POINTS_DOWN_SET,
    sliderVal,
});

export const spikeFilteringToggleAction = () => ({
    type: SPIKE_FILTER_TOGGLE,
});

const switchingPointUpMovedAction = sliderVal => ({
    type: SWITCHING_POINTS_UP_MOVE,
    sliderVal,
});

export const switchingPointDownMovedAction = sliderVal => ({
    type: SWITCHING_POINTS_DOWN_MOVE,
    sliderVal,
});

export const switchingPointUpMoved = sliderVal => (dispatch, getState) => {
    dispatch(switchingPointUpMovedAction(sliderVal));
    dispatch(
        switchingPointDownMovedAction(
            getState().app.switchingPoints.switchDownSliderPosition
        )
    );
};

function calculateSwitchingPointsUp(sliderVal) {
    return {
        switchUpLow: (sliderVal / 510.0) * 1000, // RES_LOW
        switchUpHigh: sliderVal / 28.0, // RES_MID
    };
}

function calculateSwitchingPointsDown(
    sliderVal,
    switchUpHigh,
    switchUpSliderPosition
) {
    const hysteresis = (500 - sliderVal) / 100.0;
    const temp = switchUpSliderPosition;
    const switchDownHigh = switchUpHigh / 16.3 / hysteresis;

    const switchDownLow = temp / 16.3 / hysteresis;

    return {
        switchDownHigh,
        switchDownLow,
    };
}

// eslint-disable-next-line default-param-last
export default (state = initialState, action) => {
    switch (action.type) {
        case SWITCHING_POINTS_UP_MOVE: {
            const { switchUpLow, switchUpHigh } = calculateSwitchingPointsUp(
                action.sliderVal
            );
            return {
                ...state,
                switchUpLow,
                switchUpHigh,
                switchUpSliderPosition: action.sliderVal,
            };
        }
        case SWITCHING_POINTS_DOWN_MOVE: {
            const { switchDownHigh, switchDownLow } =
                calculateSwitchingPointsDown(
                    action.sliderVal,
                    state.switchUpHigh,
                    state.switchUpSliderPosition
                );
            return {
                ...state,
                switchDownHigh,
                switchDownLow,
                switchDownSliderPosition: action.sliderVal,
            };
        }
        case SWITCHING_POINTS_DOWN_SET: {
            const { switchDownHigh, switchDownLow } =
                calculateSwitchingPointsDown(
                    action.sliderVal,
                    state.switchUpHigh,
                    state.switchUpSliderPosition
                );
            return {
                ...state,
                switchDownHigh,
                switchDownLow,
            };
        }
        case SWITCHING_POINTS_RESET: {
            const vrefHigh = action.vrefHigh || state.vrefHigh;
            const vrefLow = action.vrefHigh || state.vrefHigh;
            const switchUpSliderPosition =
                ((vrefHigh * 2) / 27000 + 1) * (0.41 / 10.98194) * 1000;
            const switchDownSliderPosition =
                500 -
                parseInt(
                    (((vrefLow * 2 + 30000) / 2000.0 + 1) / 16.3) * 100,
                    10
                );
            const { switchUpLow, switchUpHigh } = calculateSwitchingPointsUp(
                switchUpSliderPosition
            );
            const { switchDownHigh, switchDownLow } =
                calculateSwitchingPointsDown(
                    switchDownSliderPosition,
                    switchUpHigh,
                    state.switchUpSliderPosition
                );

            return {
                ...state,
                vrefHigh,
                vrefLow,
                switchUpSliderPosition,
                switchDownSliderPosition,
                switchUpLow,
                switchUpHigh,
                switchDownHigh,
                switchDownLow,
            };
        }
        case SPIKE_FILTER_TOGGLE: {
            return {
                ...state,
                spikeFiltering: !state.spikeFiltering,
            };
        }
        default:
    }
    return state;
};

export const switchingPointsState = ({ app }) => app.switchingPoints;
