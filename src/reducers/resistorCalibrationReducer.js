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
