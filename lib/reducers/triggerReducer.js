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

const initialState = {
    rms: 0,                     // [nA]
    avg: 0,                     // [nA]
    max: 0,                     // [nA]
    charge: 0,                  // [nC]
    cursorBegin: 0,             // [microseconds]
    windowLength: 0,            // [microseconds]
    cursorEnd: 0,               // [microseconds]
    windowBegin: 0,             // [microseconds]
    windowEnd: 0,               // [microseconds]
    windowDuration: 300 * 18,   // [microseconds]
    triggerUnit: 'uA',          // [microseconds]
    triggerLevel: 2500,         // [uA]
    enableExternalTrigger: false,
    triggerSingleWaiting: false,
};

export default function trigger(state = initialState, action) {
    switch (action.type) {
        case 'CHART_TRIGGER_CURSOR': {
            const { cursorBegin, cursorEnd } = action;
            return {
                ...state,
                cursorBegin,
                cursorEnd,
            };
        }
        case 'CHART_TRIGGER_WINDOW': {
            const { windowBegin, windowEnd, windowDuration } = action;
            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration,
            };
        }
        case 'TRIGGER_WINDOW_LENGTH_MOVE': {
            const { windowLength } = action;
            return {
                ...state,
                windowLength,
            };
        }
        case 'TRIGGER_WINDOW_UNIT_CHANGE': {
            const { triggerUnit } = action;
            return {
                ...state,
                triggerUnit,
            };
        }

        case 'TRIGGER_SINGLE_SET': {
            const { triggerSingleWaiting } = action;
            return {
                ...state,
                triggerSingleWaiting: true,
            };
        }

        case 'TRIGGER_SINGLE_CLEAR': {
            const { triggerSingleWaiting } = action;
            return {
                ...state,
                triggerSingleWaiting: false,
            };
        }
        default:
    }
    return state;
}
