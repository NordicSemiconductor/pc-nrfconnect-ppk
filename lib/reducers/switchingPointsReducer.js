/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { PPK_METADATA, SWITCHING_POINTS_RESET, SWITCHING_POINTS_UP_SET, SWITCHING_POINTS_DOWN_SET } from '../actions/PPKActions';
import { SWITCHING_POINTS_DOWN_MOVE, SWITCHING_POINTS_UP_MOVE } from '../actions/uiActions';

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
};

function calculateSwitchingPointsUp(sliderVal) {
    return {
        switchUpLow: (sliderVal / 510.0) * 1000, // RES_LOW
        switchUpHigh: sliderVal / 28.0,  // RES_MID
    };
}

function calculateSwitchingPointsDown(sliderVal, switchUpHigh, switchUpSliderPosition) {
    console.log('sw up high: ', switchUpHigh);
    const hysteresis = (500 - sliderVal) / 100.0;
    const temp = switchUpSliderPosition;
    const switchDownHigh = switchUpHigh / 16.3 / hysteresis;

    const switchDownLow = temp / 16.3 / hysteresis;

    return {
        switchDownHigh,
        switchDownLow,
    };
}

export default function switchingPoints(state = initialState, action) {
    switch (action.type) {
        case PPK_METADATA: {
            const {
                vrefHigh,
                vrefLow,
            } = action.metadata;
            const switchUpSliderPosition =
                (((vrefHigh * 2) / 27000) + 1) * (0.41 / 10.98194) * 1000;
            const switchDownSliderPosition =
                500 - (parseInt(((((((vrefLow * 2) + 30000) / 2000.0) + 1) / 16.3) * 100), 10));
            const {
                switchUpLow,
                switchUpHigh,
            } = calculateSwitchingPointsUp(switchUpSliderPosition);
            const {
                switchDownHigh,
                switchDownLow,
            } = calculateSwitchingPointsDown(switchDownSliderPosition,
                switchUpHigh,
                state.switchUpSliderPosition);

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
        case SWITCHING_POINTS_UP_MOVE: {
            const { switchUpLow, switchUpHigh } = calculateSwitchingPointsUp(action.sliderVal);
            return {
                ...state,
                switchUpLow,
                switchUpHigh,
                switchUpSliderPosition: action.sliderVal,
            };
        }
        case SWITCHING_POINTS_DOWN_MOVE: {
            const {
                switchDownHigh,
                switchDownLow,
            } = calculateSwitchingPointsDown(action.sliderVal,
                state.switchUpHigh,
                state.switchUpSliderPosition,
            );
            return {
                ...state,
                switchDownHigh,
                switchDownLow,
                switchDownSliderPosition: action.sliderVal,
            };
        }
        case SWITCHING_POINTS_UP_SET: {
            return {
                ...state,
            };
        }
        case SWITCHING_POINTS_DOWN_SET: {
            const switchDownSliderPosition =
                500 - (parseInt(((((((state.vrefLow * 2) + 30000) / 2000.0) + 1) / 16.3) * 100),
                10));
            const {
                switchDownHigh,
                switchDownLow,
            } = calculateSwitchingPointsDown(switchDownSliderPosition,
                    state.switchUpHigh,
                    state.switchUpSliderPosition,
            );
            return {
                ...state,
                switchDownHigh,
                switchDownLow,
            };
        }
        case SWITCHING_POINTS_RESET: {
            const {
                vrefHigh,
                vrefLow,
            } = state;
            const switchUpSliderPosition =
                (((vrefHigh * 2) / 27000) + 1) * (0.41 / 10.98194) * 1000;
            const switchDownSliderPosition =
                500 - (parseInt(((((((vrefLow * 2) + 30000) / 2000.0) + 1) / 16.3) * 100), 10));
            const {
                switchUpLow,
                switchUpHigh,
            } = calculateSwitchingPointsUp(switchUpSliderPosition);
            const {
                switchDownHigh,
                switchDownLow,
            } = calculateSwitchingPointsDown(switchDownSliderPosition,
                    switchUpHigh,
                    state.switchUpSliderPosition);

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
        default:
    }
    return state;
}
