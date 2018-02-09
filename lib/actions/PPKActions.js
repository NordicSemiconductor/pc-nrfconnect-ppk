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

 // For electron runtime optimization we need to avoid operator-assiment:
/* eslint operator-assignment: off */

import { logger } from 'nrfconnect/core';
import nRFjprogjs from 'pc-nrfjprog-js';

import * as RTT from './rtt';
import { averageChartWindow } from './uiActions';

import {
    ADC_SAMPLING_TIME_US,
    AVERAGE_TIME_US,
    TRIGGER_SAMPLES_PER_SECOND,
    AVERAGE_SAMPLES_PER_SECOND,
    BUFFER_LENGTH_IN_SECONDS,
    AVERAGE_BUFFER_LENGTH,
    PPKCmd,
} from '../constants';

export const PPK = {
    port: null,
};

export const triggerOptions = {
    data: [],
    index: 0,
    timestamp: 0,
    samplesPerSecond: TRIGGER_SAMPLES_PER_SECOND,
    color: 'rgba(79, 140, 196, 1)',
    valueRange: {
        min: 0,
        max: 65535,
    },
};

export const averageOptions = {
    data: new Array(Math.trunc(AVERAGE_BUFFER_LENGTH)),
    index: 0,
    timestamp: 0,
    samplesPerSecond: AVERAGE_SAMPLES_PER_SECOND,
    color: 'rgba(179, 40, 96, 1)',
    valueRange: {
        min: -1,
        max: 15000,
    },
};

export const PPK_OPENED = 'PPK_OPENED';
export const PPK_CLOSED = 'PPK_CLOSED';
export const PPK_METADATA = 'PPK_METADATA';
export const PPK_ANIMATION = 'PPK_ANIMATION';
export const DEVICE_UNDER_TEST_TOGGLE = 'DEVICE_UNDER_TEST_TOGGLE';
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

function ppkOpenedAction(portName) {
    return {
        type: PPK_OPENED,
        portName,
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
        averageIndex: averageOptions.index,
        triggerIndex: triggerOptions.index,
    };
}

function ppkToggleDUTAction() {
    return {
        type: DEVICE_UNDER_TEST_TOGGLE,
    };
}

function ppkTriggerValueSetAction(triggerVal, triggerUnit) {
    return {
        type: TRIGGER_VALUE_SET,
        triggerVal,
        triggerUnit,
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

function ppkDataReceivedAction() {
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

function convertFloatToByteBuffer(floatnum) {
    const float = new Float32Array(1);
    float[0] = floatnum;
    const bytes = new Uint8Array(float.buffer);

    return bytes;
}

/* Start reading current measurements */
export function averageStart() {
    return async (dispatch, getState) => {
        averageOptions.data.fill(undefined);
        averageOptions.index = 0;
        dispatch(averageChartWindow(0, 0, getState().app.average.windowDuration));
        dispatch(ppkAverageStartAction());
        await RTT.PPKCommandSend([PPKCmd.AverageStart]);
        logger.info('Average started');
    };
}

export function averageStop() {
    return async dispatch => {
        dispatch(ppkAverageStoppedAction());
        await RTT.PPKCommandSend([PPKCmd.AverageStop]);
        logger.info('Average stopped');
    };
}

export function close() {
    return async dispatch => {
        await RTT.stop();
        RTT.events.removeAllListeners();
        dispatch(ppkClosedAction());
        logger.info('PPK closed');
    };
}

export function open(serialPort) {
    return async (dispatch, getState) => {
        if (getState().app.portName) {
            await dispatch(close());
        }

        dispatch(ppkOpenedAction(serialPort.comName));
        logger.info('PPK opened');

        let throttleUpdates = false;

        const updateChart = () => {
            if (throttleUpdates) {
                return;
            }
            throttleUpdates = true;
            requestAnimationFrame(() => {
                throttleUpdates = false;
                dispatch(ppkAnimationAction());
            });
        };

        RTT.events.on('average', (value, timestamp) => {
            const { averageRunning, windowBegin, windowEnd } = getState().app.average;
            if (!averageRunning) {
                // skip incoming data after stopped
                return;
            }
            if ((windowBegin !== 0 || windowEnd !== 0)
                && timestamp >= windowBegin + (BUFFER_LENGTH_IN_SECONDS * 1e6)) {
                // stop average when reaches end of buffer (i.e. would overwrite chart data)
                console.log(timestamp, getState().app.average);
                dispatch(averageStop());
                return;
            }

            let avgts = averageOptions.timestamp;
            while (avgts < timestamp - AVERAGE_TIME_US) {
                avgts = avgts + AVERAGE_TIME_US;
                averageOptions.data[averageOptions.index] = undefined;
                averageOptions.index = averageOptions.index + 1;
                if (averageOptions.index === averageOptions.data.length) {
                    averageOptions.index = 0;
                }
            }
            averageOptions.data[averageOptions.index] = value;
            averageOptions.index = averageOptions.index + 1;
            averageOptions.timestamp = timestamp;
            if (averageOptions.index === averageOptions.data.length) {
                averageOptions.index = 0;
            }
            updateChart();
        });

        RTT.events.on('trigger', (triggerData, timestamp) => {
            triggerOptions.data = triggerData;
            triggerOptions.index = triggerOptions.index + 1;
            triggerOptions.timestamp = timestamp;
            updateChart();
            dispatch(ppkDataReceivedAction());
        });

        logger.info('Initializing the PPK');
        await new Promise(resolve => {
            nRFjprogjs.getProbeInfo(serialPort.serialNumber, (err, info) => {
                logger.info('Segger serial: ', info.serialNumber);
                logger.info('Segger speed: ', info.clockSpeedkHz, ' kHz');
                logger.info('Segger version: ', info.firmwareString);
                resolve();
            });
        });
        RTT.events.on('error', (message, error) => {
            logger.error(message);
            if (error) {
                dispatch(close());
                logger.debug(error);
            }
        });
        try {
            const metadata = await RTT.start(serialPort.serialNumber);

            dispatch(ppkMetadataAction(metadata));
            dispatch(rttStartAction());
            // Lets start the read loop here
            await RTT.read();
            logger.info('PPK started');
        } catch (err) {
            logger.error('Failed to start the PPK.');
            logger.debug(err);
        }
    };
}

export function ppkUpdateRegulator() {
    /* eslint-disable no-bitwise */
    return async (dispatch, getState) => {
        const rttresults = [];

        let currentVDD = getState().app.voltageRegulator.currentVDD;
        const targetVdd = getState().app.voltageRegulator.vdd;
        let newValue = 0;

        while (currentVDD !== targetVdd) {
            if (targetVdd > currentVDD) {
                newValue = ((Math.abs(targetVdd - currentVDD) > 10)
                ? currentVDD + 10 : targetVdd);
            } else {
                newValue = ((Math.abs(targetVdd - currentVDD) > 200)
                ? currentVDD - 200 : targetVdd);
            }
            const VddHighByte = (newValue >> 8);
            const VddLowByte = (newValue & 0xFF);
            rttresults.push(RTT.PPKCommandSend([PPKCmd.RegulatorSet, VddHighByte, VddLowByte]));
            currentVDD = newValue;
        }
        await Promise.all(rttresults);
        dispatch(ppkUpdateRegulatorAction(newValue));
    };
}


/**
 * Takes the window value in milliseconds, adjusts for microsecs
 * and resolves the number of bytes we need for this size of window.
 * @param {number} value  Value received in milliseconds
 * @returns {null} Nothing
 */
export function ppkTriggerUpdateWindow(value) {
    return async () => {
        const triggerWindowMicroSec = value * 1000;
        let PPKtriggerWindow = triggerWindowMicroSec / ADC_SAMPLING_TIME_US;
        // If division returns a decimal, round downward to nearest integer
        PPKtriggerWindow = Math.floor(PPKtriggerWindow);
        const triggerHigh = PPKtriggerWindow >> 8;
        const triggerLow = PPKtriggerWindow & 0xFF;
        await RTT.PPKCommandSend([PPKCmd.TriggerWindowSet, triggerHigh, triggerLow]);
        logger.info('Trigger window updated');
    };
}
/*
 *   TODO: Can fetch this from state or
 * function call to triggerToggle. Bence ?
 */
let mtriggerVal = 1;
let mtriggerUnit = 'mA';

export function ppkTriggerSet(triggerVal, triggerUnit) {
    /* eslint-disable no-bitwise */
    return async dispatch => {
        let triggerMicroAmp = 0;

        if (!Number.isInteger(parseInt(triggerVal, 10))) {
            logger.warning('Trigger ', triggerVal, ' is not a valid value');
            return;
        }
        logger.info('Trigger level set: ', triggerVal, triggerUnit);
        if (triggerUnit === 'mA') {
            triggerMicroAmp = triggerVal * 1000;
        } else {
            triggerMicroAmp = triggerVal;
        }
        const high = (triggerMicroAmp >> 16) & 0xFF;
        const mid = (triggerMicroAmp >> 8) & 0xFF;
        const low = triggerMicroAmp & 0xFF;
        await RTT.PPKCommandSend([PPKCmd.TriggerSet, high, mid, low]);

        // Change this to use state
        mtriggerUnit = triggerUnit;
        mtriggerVal = triggerVal;
        triggerOptions.data.fill(undefined);
        triggerOptions.index = 0;
        dispatch(ppkTriggerValueSetAction(triggerVal, triggerUnit));
    };
}

export function ppkTriggerToggle() {
    return async (dispatch, getState) => {
        let triggerRunning = getState().app.trigger.triggerRunning;

        if (triggerRunning) {
            // Stop trigger
            logger.info('Stopping trigger');
            await RTT.PPKCommandSend([PPKCmd.TriggerStop]);
            triggerRunning = false;
            dispatch(ppkToggleTriggerAction(triggerRunning));
        } else {
            // Start trigger
            logger.info('Starting trigger');
            triggerRunning = true;
            dispatch(ppkTriggerSet(mtriggerVal, mtriggerUnit));
        }
    };
}

export function ppkTriggerSingleSet() {
    return async (dispatch, getState) => {
        const unit = getState().app.trigger.triggerUnit;
        const triggerVal = getState().app.trigger.triggerLevel;
        let triggerMicroAmp = 0;

        if (unit === 'mA') {
            triggerMicroAmp = triggerVal * 1000;
        } else {
            triggerMicroAmp = triggerVal;
        }
        const high = (triggerMicroAmp >> 16) & 0xFF;
        const mid = (triggerMicroAmp >> 8) & 0xFF;
        const low = triggerMicroAmp & 0xFF;

        await RTT.PPKCommandSend([PPKCmd.TriggerSingleSet, high, mid, low]);
        dispatch(ppkTriggerSingleSetAction());
    };
}

export function ppkToggleDUT(isOn) {
    return async dispatch => {
        if (isOn) {
            await RTT.PPKCommandSend([PPKCmd.DutToggle, 0]);
            logger.info('DUT OFF');
        } else {
            await RTT.PPKCommandSend([PPKCmd.DutToggle, 1]);
            logger.info('DUT ON');
        }
        dispatch(ppkToggleDUTAction());
    };
}

export function updateResistors() {
    return async (dispatch, getState) => {
        const low = getState().app.resistorCalibration.userResLo;
        const mid = getState().app.resistorCalibration.userResMid;
        const high = getState().app.resistorCalibration.userResHi;

        const lowbytes = convertFloatToByteBuffer(low);
        const midbytes = convertFloatToByteBuffer(mid);
        const highbytes = convertFloatToByteBuffer(high);

        await RTT.PPKCommandSend([
            PPKCmd.ResUserSet,
            lowbytes[0], lowbytes[1], lowbytes[2], lowbytes[3],
            midbytes[0], midbytes[1], midbytes[2], midbytes[3],
            highbytes[0], highbytes[1], highbytes[2], highbytes[3],
        ]);

        RTT.setResistors(low, mid, high);
    };
}

export function resetResistors() {
    return async (dispatch, getState) => {
        const low = getState().app.resistorCalibration.resLo;
        const mid = getState().app.resistorCalibration.resMid;
        const high = getState().app.resistorCalibration.resHi;

        const lowbytes = convertFloatToByteBuffer(low);
        const midbytes = convertFloatToByteBuffer(mid);
        const highbytes = convertFloatToByteBuffer(high);

        await RTT.PPKCommandSend([
            PPKCmd.ResUserSet,
            lowbytes[0], lowbytes[1], lowbytes[2], lowbytes[3],
            midbytes[0], midbytes[1], midbytes[2], midbytes[3],
            highbytes[0], highbytes[1], highbytes[2], highbytes[3],
        ]);
        RTT.setResistors(low, mid, high);
        dispatch(resistorsResetAction());
    };
}

export function externalTriggerToggled(chbState) {
    return async dispatch => {
        if (chbState) {
            await RTT.PPKCommandSend([PPKCmd.TriggerStop]);
        }
        await RTT.PPKCommandSend([PPKCmd.TriggerExtToggle]);
        dispatch(ppkExternalTriggerToggledAction());
    };
}

export function spikeFilteringToggle() {
    return async (dispatch, getState) => {
        if (getState().app.switchingPoints.spikeFiltering === false) {
            await RTT.PPKCommandSend([PPKCmd.SpikeFilteringOn]);
        } else {
            await RTT.PPKCommandSend([PPKCmd.SpikeFilteringOff]);
        }
        dispatch(ppkSpikeFilteringToggleAction());
    };
}

export function ppkSwitchingPointsUpSet() {
    return async (dispatch, getState) => {
        const sliderVal = getState().app.switchingPoints.switchUpSliderPosition;
        const pot = 13500.0 * ((((10.98194 * sliderVal) / 1000) / 0.41) - 1);
        const vrefUpMSB = parseInt((pot), 10) >> 8;
        const vrefUpLSB = parseInt((pot), 10) & 0xFF;
        RTT.PPKCommandSend([PPKCmd.SwitchPointUp, vrefUpMSB, vrefUpLSB]);
        dispatch(ppkSwitchingPointsUpSetAction());
    };
}

export function ppkSwitchingPointsDownSet() {
    return async (dispatch, getState) => {
        const sliderVal = getState().app.switchingPoints.switchDownSliderPosition;
        const pot = (2000.0 * (((16.3 * (500 - sliderVal)) / 100.0) - 1)) - 30000.0;
        const vrefDownMSB = parseInt((pot / 2), 10) >> 8;
        const vrefDownLSB = parseInt((pot / 2), 10) & 0xFF;
        RTT.PPKCommandSend([PPKCmd.SwitchPointDown, vrefDownMSB, vrefDownLSB]);
        dispatch(ppkSwitchingPointsDownSetAction(sliderVal));
    };
}

export function ppkSwitchingPointsReset() {
    return async dispatch => {
        // Reset state of slider to initial values
        dispatch(ppkSwitchingPointsResetAction());
        // Set these initial values in hardware
        dispatch(ppkSwitchingPointsUpSet());
        dispatch(ppkSwitchingPointsDownSet());
    };
}
