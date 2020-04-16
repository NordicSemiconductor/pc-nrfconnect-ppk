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

// For electron runtime optimization we need to avoid operator-assiment:

import { logger } from 'nrfconnect/core';
import Device from '../device';
import { averageChartWindow } from './uiActions';

let device = null;
let updateRequestInterval;

const bufferLengthInSeconds = 60 * 12;
const samplingTime = 10;
const samplesPerSecond = 1e6 / samplingTime;

export const options = {
    samplingTime,
    samplesPerSecond,
    data: new Float32Array(samplesPerSecond * bufferLengthInSeconds),
    bits: null,
    index: 0,
    renderIndex: undefined,
    timestamp: 0,
    color: 'rgba(179, 40, 96, 1)',
    valueRange: {
        min: 0,
        max: 15000,
    },
};

export const PPK_OPENED = 'PPK_OPENED';
export const PPK_CLOSED = 'PPK_CLOSED';
export const PPK_METADATA = 'PPK_METADATA';
export const PPK_ANIMATION = 'PPK_ANIMATION';
export const DEVICE_UNDER_TEST_TOGGLE = 'DEVICE_UNDER_TEST_TOGGLE';
export const SET_POWER_MODE = 'SET_POWER_MODE';
export const TRIGGER_VALUE_SET = 'TRIGGER_VALUE_SET';
export const TRIGGER_TOGGLE = 'TRIGGER_TOGGLE';
export const TRIGGER_SINGLE_SET = 'TRIGGER_SINGLE_SET';
export const AVERAGE_STARTED = 'AVERAGE_STARTED';
export const AVERAGE_STOPPED = 'AVERAGE_STOPPED';
export const TRIGGER_SINGLE_CLEAR = 'TRIGGER_SINGLE_CLEAR';
export const RTT_CALLED_START = 'RTT_CALLED_START';
export const RESISTORS_RESET = 'RESISTORS_RESET';
export const EXTERNAL_TRIGGER_TOGGLE = 'EXTERNAL_TRIGGER_TOGGLE';
export const VOLTAGE_REGULATOR_UPDATED = 'VOLTAGE_REGULATOR_UPDATED';
export const SWITCHING_POINTS_UPDATED = 'SWITCHING_POINTS_UPDATED';
export const SWITCHING_POINTS_RESET = 'SWITCHING_POINTS_RESET';
export const SWITCHING_POINTS_DOWN_SET = 'SWITCHING_POINTS_DOWN_SET';
export const SWITCHING_POINTS_UP_SET = 'SWITCHING_POINTS_UP_SET';
export const SPIKE_FILTER_TOGGLE = 'SPIKE_FILTER_TOGGLE';

function ppkOpenedAction(portName, capabilities) {
    return {
        type: PPK_OPENED,
        portName,
        capabilities,
    };
}

function ppkClosedAction() {
    return {
        type: PPK_CLOSED,
    };
}

function ppkMetadataAction(metadata) {
    return {
        type: PPK_METADATA,
        metadata,
    };
}

function ppkAnimationAction() {
    return {
        type: PPK_ANIMATION,
        index: options.index,
    };
}

function ppkToggleDUTAction() {
    return {
        type: DEVICE_UNDER_TEST_TOGGLE,
    };
}

function ppkSetPowerModeAction() {
    return {
        type: SET_POWER_MODE,
    };
}

function ppkTriggerLevelSetAction(triggerLevel) {
    return {
        type: TRIGGER_VALUE_SET,
        triggerLevel,
    };
}

function ppkToggleTriggerAction(triggerRunning) {
    return {
        type: TRIGGER_TOGGLE,
        triggerRunning,
    };
}

function ppkTriggerSingleSetAction() {
    return {
        type: TRIGGER_SINGLE_SET,
    };
}

function ppkAverageStartAction() {
    return {
        type: AVERAGE_STARTED,
    };
}

function ppkAverageStoppedAction() {
    return {
        type: AVERAGE_STOPPED,
    };
}

function ppkClearSingleTriggingAction() {
    return {
        type: TRIGGER_SINGLE_CLEAR,
    };
}

function rttStartAction() {
    return {
        type: RTT_CALLED_START,
    };
}

function resistorsResetAction() {
    return {
        type: RESISTORS_RESET,
    };
}

function ppkExternalTriggerToggledAction() {
    return {
        type: EXTERNAL_TRIGGER_TOGGLE,
    };
}

function ppkSpikeFilteringToggleAction() {
    return {
        type: SPIKE_FILTER_TOGGLE,
    };
}

function ppkUpdateRegulatorAction(currentVDD) {
    return {
        type: VOLTAGE_REGULATOR_UPDATED,
        currentVDD,
    };
}
function ppkSwitchingPointsUpSetAction() {
    return {
        type: SWITCHING_POINTS_UP_SET,
    };
}
function ppkSwitchingPointsDownSetAction(sliderVal) {
    return {
        type: SWITCHING_POINTS_DOWN_SET,
        sliderVal,
    };
}
function ppkSwitchingPointsResetAction() {
    return {
        type: SWITCHING_POINTS_RESET,
    };
}

function setupOptions() {
    console.log(device.capabilities);
    options.samplingTime = device.adcSamplingTimeUs;
    options.samplesPerSecond = 1e6 / options.samplingTime;
    const bufferLength = Math.trunc(options.samplesPerSecond * bufferLengthInSeconds);
    if (device.capabilities.ppkSetPowerMode) {
        if (!options.bits || options.bits.length !== bufferLength) {
            options.bits = new Uint8Array(bufferLength);
        }
    } else {
        options.bits = null;
    }
    if (options.data.length !== bufferLength) {
        options.data = new Float32Array(bufferLength);
    }
}


/* Start reading current measurements */
export function averageStart() {
    return async (dispatch, getState) => {
        options.data.fill(undefined);
        options.index = 0;
        dispatch(averageChartWindow(null, null, getState().app.average.windowDuration), null, null);
        dispatch(ppkAverageStartAction());
        await device.ppkAverageStart();
        logger.info('Average started');
    };
}

export function averageStop() {
    return async dispatch => {
        dispatch(ppkAverageStoppedAction());
        await device.ppkAverageStop();
        logger.info('Average stopped');
    };
}

export function triggerStop() {
    return async dispatch => {
        logger.info('Stopping trigger');
        await device.ppkTriggerStop();
        dispatch(ppkToggleTriggerAction(false));
        dispatch(ppkClearSingleTriggingAction());
    };
}

export function close() {
    return async (dispatch, getState) => {
        clearInterval(updateRequestInterval);
        if (!device) {
            return;
        }
        if (getState().app.average.averageRunning) {
            await dispatch(averageStop());
        }
        if (getState().app.trigger.triggerRunning) {
            await dispatch(triggerStop());
        }
        await device.stop();
        device.removeAllListeners();
        device = null;
        dispatch(ppkClosedAction());
        logger.info('PPK closed');
    };
}

export function open(deviceInfo) {
    return async (dispatch, getState) => {
        if (getState().app.portName) {
            await dispatch(close());
        }

        const onSample = ({
            value, bits, timestamp, trigger,
        }) => {
            const { averageRunning, windowBegin, windowEnd } = getState().app.average;
            if (!averageRunning && !trigger) {
                // skip incoming data after stopped
                return;
            }

            if (timestamp) {
                let avgts = options.timestamp;
                while (avgts < timestamp - options.samplingTime) {
                    avgts += options.samplingTime;
                    options.data[options.index] = undefined;
                    options.index += 1;
                    if (options.index === options.data.length) {
                        options.index = 0;
                    }
                }
                options.data[options.index] = value;
                options.index += 1;
                options.timestamp = timestamp;
            } else {
                options.data[options.index] = value;
                options.bits[options.index] = bits;
                options.index += 1;
                options.timestamp += options.samplingTime;
            }

            if ((windowBegin !== 0 || windowEnd !== 0)
                && options.timestamp >= windowBegin + (bufferLengthInSeconds * 1e6)) {
                // stop average when reaches end of buffer (i.e. would overwrite chart data)
                dispatch(averageStop());
                return;
            }

            if (options.index === options.data.length) {
                options.index = 0;
            }
        };

        try {
            device = new Device(deviceInfo, onSample);
            setupOptions(device);
            const metadata = device.parseMeta(await device.start());

            dispatch(ppkMetadataAction(metadata));
            dispatch(rttStartAction());
            logger.info('PPK started');
        } catch (err) {
            logger.error('Failed to start the PPK.');
            logger.debug(err);
            dispatch({ type: 'DEVICE_DESELECTED' });
        }

        dispatch(ppkOpenedAction(deviceInfo.serialNumber, device.capabilities));
        logger.info('PPK opened');

        device.on('error', (message, error) => {
            logger.error(message);
            if (error) {
                dispatch(close());
                logger.debug(error);
            }
        });

        clearInterval(updateRequestInterval);
        updateRequestInterval = setInterval(() => {
            if (options.renderIndex !== options.index) {
                requestAnimationFrame(() => dispatch(ppkAnimationAction()));
                options.renderIndex = options.index;
            }
        }, 10);
    };
}

export function updateRegulator() {
    return async (dispatch, getState) => {
        const { vdd } = getState().app.voltageRegulator;
        await device.ppkUpdateRegulator(vdd);
        dispatch(ppkUpdateRegulatorAction(vdd));
    };
}


/**
 * Takes the window value in milliseconds, adjusts for microsecs
 * and resolves the number of bytes we need for this size of window.
 * @param {number} value  Value received in milliseconds
 * @returns {null} Nothing
 */
export function triggerUpdateWindow(value) {
    return async () => {
        const triggerWindowMicroSec = value * 1000;
        const triggerWindow = triggerWindowMicroSec / options.samplingTime;
        // If division returns a decimal, round downward to nearest integer
        await device.ppkTriggerWindowSet(Math.floor(triggerWindow));
        logger.info('Trigger window updated');
    };
}

export function triggerSet(triggerLevel) {
    /* eslint-disable no-bitwise */
    return async dispatch => {
        logger.info('Trigger level set: ', triggerLevel, 'uA');
        const high = (triggerLevel >> 16) & 0xFF;
        const mid = (triggerLevel >> 8) & 0xFF;
        const low = triggerLevel & 0xFF;
        await device.ppkTriggerSet(high, mid, low);

        dispatch(ppkTriggerLevelSetAction(triggerLevel));
    };
}

export function triggerStart() {
    return async (dispatch, getState) => {
        // Start trigger
        const { triggerLevel } = getState().app.trigger;

        logger.info('Starting trigger');
        dispatch(ppkToggleTriggerAction(true));
        dispatch(ppkClearSingleTriggingAction());
        dispatch(triggerSet(triggerLevel));
    };
}

export function triggerSingleSet() {
    return async (dispatch, getState) => {
        const { triggerLevel } = getState().app.trigger;
        const high = (triggerLevel >> 16) & 0xFF;
        const mid = (triggerLevel >> 8) & 0xFF;
        const low = triggerLevel & 0xFF;

        await device.ppkTriggerSingleSet(high, mid, low);
        dispatch(ppkTriggerSingleSetAction());
    };
}

export function toggleDUT(isOn) {
    return async dispatch => {
        await device.ppkToggleDUT(isOn ? 0 : 1);
        logger.info(`DUT ${isOn ? 'ON' : 'OFF'}`);
        dispatch(ppkToggleDUTAction());
    };
}

export function setPowerMode(isSmuMode) {
    return async dispatch => {
        await device.ppkSetPowerMode(isSmuMode ? 0 : 1);
        logger.info(`Mode: ${isSmuMode ? 'Amperemeter' : 'SMU'}`);
        dispatch(ppkSetPowerModeAction());
    };
}

export function updateResistors() {
    return async (_, getState) => {
        const { userResLo, userResMid, userResHi } = getState().app.resistorCalibration;
        await device.ppkUpdateResistors(userResLo, userResMid, userResHi);
    };
}

export function resetResistors() {
    return async (dispatch, getState) => {
        const { resLo, resMid, resHi } = getState().app.resistorCalibration;
        await device.ppkUpdateResistors(resLo, resMid, resHi);
        dispatch(resistorsResetAction());
    };
}

export function externalTriggerToggled(chbState) {
    return async dispatch => {
        if (chbState) {
            await device.ppkTriggerStop();
        }
        await device.ppkTriggerExtToggle();
        dispatch(ppkExternalTriggerToggledAction());
    };
}

export function spikeFilteringToggle() {
    return async (dispatch, getState) => {
        if (getState().app.switchingPoints.spikeFiltering === false) {
            await device.ppkSpikeFilteringOn();
        } else {
            await device.ppkSpikeFilteringOff();
        }
        dispatch(ppkSpikeFilteringToggleAction());
    };
}

export function switchingPointsUpSet() {
    return async (dispatch, getState) => {
        const { switchUpSliderPosition } = getState().app.switchingPoints;
        const pot = 13500.0 * ((((10.98194 * switchUpSliderPosition) / 1000) / 0.41) - 1);
        await device.ppkSwitchPointUp(parseInt((pot), 10));
        dispatch(ppkSwitchingPointsUpSetAction());
    };
}

export function switchingPointsDownSet() {
    return async (dispatch, getState) => {
        const { switchDownSliderPosition } = getState().app.switchingPoints;
        const pot = (2000.0 * (((16.3 * (500 - switchDownSliderPosition)) / 100.0) - 1)) - 30000.0;
        await device.ppkSwitchPointDown(parseInt((pot / 2), 10));
        dispatch(ppkSwitchingPointsDownSetAction(switchDownSliderPosition));
    };
}

export function switchingPointsReset() {
    return async dispatch => {
        // Reset state of slider to initial values
        dispatch(ppkSwitchingPointsResetAction());
        // Set these initial values in hardware
        await dispatch(switchingPointsUpSet());
        await dispatch(switchingPointsDownSet());
    };
}
