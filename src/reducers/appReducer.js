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

import persistentStore from '../utils/persistentStore';

const initialState = {
    portName: null,
    metadata: [],
    isSmuMode: false,
    deviceRunning: false,
    rttRunning: false,
    advancedMode: false,
    capabilities: {},
    samplingRunning: false,
    isSaveChoiceDialogVisible: false,
    isExportDialogVisible: false,
    fileLoaded: false,
};

const DEVICE_CLOSED = 'DEVICE_CLOSED';
const DEVICE_OPENED = 'DEVICE_OPENED';
const SET_DEVICE_RUNNING = 'SET_DEVICE_RUNNING';
const RTT_CALLED_START = 'RTT_CALLED_START';
const SAMPLING_STARTED = 'SAMPLING_STARTED';
const SAMPLING_STOPPED = 'SAMPLING_STOPPED';
const SET_POWER_MODE = 'SET_POWER_MODE';
const TOGGLE_ADVANCED_MODE = 'TOGGLE_ADVANCED_MODE';
const TOGGLE_SAVE_CHOICE_DIALOG = 'TOGGLE_SAVE_CHOICE_DIALOG';
const SHOW_EXPORT_DIALOG = 'SHOW_EXPORT_DIALOG';
const HIDE_EXPORT_DIALOG = 'HIDE_EXPORT_DIALOG';
const SET_FILE_LOADED = 'SET_FILE_LOADED';

// This action is defined in pc-nrfconnect-launcher:
const SET_CURRENT_PANE = 'SET_CURRENT_PANE';

export const toggleAdvancedModeAction = () => ({ type: TOGGLE_ADVANCED_MODE });
export const samplingStartAction = () => ({ type: SAMPLING_STARTED });
export const samplingStoppedAction = () => ({ type: SAMPLING_STOPPED });

export const deviceOpenedAction = (portName, capabilities) => ({
    type: DEVICE_OPENED,
    portName,
    capabilities,
});

export const deviceClosedAction = () => ({ type: DEVICE_CLOSED });
export const setDeviceRunningAction = isRunning => ({
    type: SET_DEVICE_RUNNING,
    isRunning,
});

export const setPowerModeAction = isSmuMode => ({
    type: SET_POWER_MODE,
    isSmuMode,
});

export const rttStartAction = () => ({ type: RTT_CALLED_START });
export const toggleSaveChoiceDialog = () => ({
    type: TOGGLE_SAVE_CHOICE_DIALOG,
});
export const showExportDialog = () => ({ type: SHOW_EXPORT_DIALOG });
export const hideExportDialog = () => ({ type: HIDE_EXPORT_DIALOG });

export const setFileLoadedAction = loaded => ({
    type: SET_FILE_LOADED,
    loaded,
});

export const setCurrentPane = currentPane => ({
    type: SET_CURRENT_PANE,
    currentPane,
});

export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case DEVICE_OPENED: {
            const { portName, capabilities } = action;
            return {
                ...state,
                portName,
                capabilities: { ...capabilities },
            };
        }
        case DEVICE_CLOSED:
            return initialState;
        case SET_DEVICE_RUNNING:
            return { ...state, deviceRunning: action.isRunning };
        case SET_POWER_MODE:
            return { ...state, ...action };
        case RTT_CALLED_START:
            return { ...state, rttRunning: true };
        case TOGGLE_ADVANCED_MODE:
            return { ...state, advancedMode: !state.advancedMode };
        case TOGGLE_SAVE_CHOICE_DIALOG:
            return {
                ...state,
                isSaveChoiceDialogVisible: !state.isSaveChoiceDialogVisible,
            };
        case SET_FILE_LOADED:
            return {
                ...state,
                fileLoaded: action.loaded,
            };
        case SHOW_EXPORT_DIALOG:
            return { ...state, isExportDialogVisible: true };
        case HIDE_EXPORT_DIALOG:
            return { ...state, isExportDialogVisible: false };
        case SAMPLING_STARTED:
            return { ...state, samplingRunning: true };
        case SAMPLING_STOPPED:
            return { ...state, samplingRunning: false };
        case SET_CURRENT_PANE:
            persistentStore.set('currentPane', action.currentPane);
            return state;
        default:
    }
    return state;
};

export const appState = ({ app }) => app.app;

export const advancedMode = state => state.app.app.advancedMode;
export const deviceOpen = state =>
    Object.keys(state.app.app.capabilities).length > 0;

export const currentPane = state => state.appLayout.currentPane;
