/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
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
};

export const EXTERNAL_TRIGGER_TOGGLE = 'EXTERNAL_TRIGGER_TOGGLE';
export const TRIGGER_SINGLE_CLEAR = 'TRIGGER_SINGLE_CLEAR';
export const TRIGGER_SINGLE_SET = 'TRIGGER_SINGLE_SET';
export const TRIGGER_TOGGLE = 'TRIGGER_TOGGLE';
export const TRIGGER_LEVEL_SET = 'TRIGGER_LEVEL_SET';
export const TRIGGER_LENGTH_SET = 'TRIGGER_LENGTH_SET';
export const TRIGGER_WINDOW_RANGE = 'TRIGGER_WINDOW_RANGE';

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

        case TRIGGER_LEVEL_SET:
        case TRIGGER_LENGTH_SET:
        case TRIGGER_WINDOW_RANGE: {
            return { ...state, ...action };
        }
        default:
    }
    return state;
};

export const triggerState = ({ app }) => app.trigger;
