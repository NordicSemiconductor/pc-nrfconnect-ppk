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

import { PPK_METADATA, SWITCHING_POINTS_RESET } from '../actions/PPKActions';
import { SWITCHING_POINTS_DOWN_MOVE, SWITCHING_POINTS_UP_MOVE } from '../actions/uiActions';

const initialState = {
    switchUpHigh: 3110,
    switchUpLow: 207,
    switchDownHigh: 50,
    switchDownLow: 1.53,
    enableSwitchFilter: true,
    vrefHigh: 47972,
    vrefLow: 25728,
    switchUpSliderPosition: 50,
    switchDownSliderPosition: 300,
};

export default function switchingPoints(state = initialState, action) {
    switch (action.type) {
        case PPK_METADATA: {
            const {
                vrefHigh,
                vrefLow,
            } = action.metadata;
            return {
                ...state,
                vrefHigh,
                vrefLow,
            };
        }
        case SWITCHING_POINTS_UP_MOVE: {
            const sliderVal = action.sliderVal;
            return {
                ...state,
                switchUpLow: (sliderVal / 510.0) * 1000, // RES_LOW
                switchUpHigh: sliderVal / 28.0,  // RES_MID
                switchUpSliderPosition: sliderVal,
            };
        }
        case SWITCHING_POINTS_DOWN_MOVE: {
            const hysteresis = (500 - action.sliderVal) / 100.0;
            const sliderVal = action.sliderVal;
            const temp = state.switchUpSliderPosition;
            const switchDownHigh = state.switchUpHigh / 16.3 / hysteresis;

            const switchDownLow = temp / 16.3 / hysteresis;

            return {
                ...state,
                switchDownHigh,
                switchDownLow,
                switchDownSliderPosition: sliderVal,
            };
        }
        case SWITCHING_POINTS_RESET: {
            return {
                ...state,
                // switchUpSliderPosition: (vrefHigh * ((((2 / 27000.0) + 1) *
                // (0.41 / 10.98194)) * 1000)),
                // switchDownSliderPosition: (vrefLow * (((((2 + 30000) / 2000.0) + 1) / 16.3) * 100)),
            };
        }
        default:
    }
    return state;
}
