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
/* eslint operator-assignment: off */

import { logger } from 'nrfconnect/core';
import * as Transport from './transport';
import { averageChartWindow } from './uiActions';

import {
    AVERAGE_TIME_US,
    AVERAGE_SAMPLES_PER_SECOND,
    BUFFER_LENGTH_IN_SECONDS,
    AVERAGE_BUFFER_LENGTH,
    PPKCmd,
} from '../constants';

export const PPK = {
    port: null,
};

export const averageOptions = {
    data: new Float32Array(Math.trunc(AVERAGE_BUFFER_LENGTH)),
    bits: new Uint8Array(Math.trunc(AVERAGE_BUFFER_LENGTH)),
    index: 0,
    timestamp: 0,
    samplesPerSecond: AVERAGE_SAMPLES_PER_SECOND,
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
export const AVERAGE_STARTED = 'AVERAGE_STARTED';
export const AVERAGE_STOPPED = 'AVERAGE_STOPPED';
export const RTT_CALLED_START = 'RTT_CALLED_START';
export const RESISTORS_RESET = 'RESISTORS_RESET';
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
    };
}

function ppkToggleDUTAction() {
    return {
        type: DEVICE_UNDER_TEST_TOGGLE,
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
        averageOptions.bits.fill(undefined);
        averageOptions.index = 0;
        dispatch(averageChartWindow(null, null, getState().app.average.windowDuration), null, null);
        dispatch(ppkAverageStartAction());
        await Transport.PPKCommandSend([PPKCmd.AverageStart]);
        logger.info('Average started');
    };
}

export function averageStop() {
    return async dispatch => {
        dispatch(ppkAverageStoppedAction());
        await Transport.PPKCommandSend([PPKCmd.AverageStop]);
        logger.info('Average stopped');
    };
}

export function close() {
    return async (dispatch, getState) => {
        if (getState().app.average.averageRunning) {
            await dispatch(averageStop());
        }
        await Transport.close();
        Transport.events.removeAllListeners();
        dispatch(ppkClosedAction());
        logger.info('PPK closed');
    };
}
let count = 0;
export function open(device) {
    return async (dispatch, getState) => {
        if (getState().app.portName) {
            await dispatch(close());
        }

        dispatch(ppkOpenedAction(device.serialNumber));
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

        Transport.events.average = (value, bits) => {
            const { averageRunning, windowBegin, windowEnd } = getState().app.average;
            if (!averageRunning) {
                // skip incoming data after stopped
                return;
            }

            averageOptions.data[averageOptions.index] = value;
            averageOptions.bits[averageOptions.index] = bits;

            averageOptions.index = averageOptions.index + 1;
            averageOptions.timestamp += AVERAGE_TIME_US;

            if ((windowBegin !== 0 || windowEnd !== 0)
                && averageOptions.timestamp >= windowBegin + (BUFFER_LENGTH_IN_SECONDS * 1e6)) {
                // stop average when reaches end of buffer (i.e. would overwrite chart data)
                dispatch(averageStop());
                return;
            }

            if (averageOptions.index === averageOptions.data.length) {
                averageOptions.index = 0;
            }
            count = count + 1;
            if (count > 5000) {
                updateChart();
                count = 0;
            }
        };

        Transport.events.on('error', (message, error) => {
            logger.error(message);
            if (error) {
                // dispatch(close());
                logger.debug(error);
            }
        });
        try {
            const metadata = await Transport.open(device);

            dispatch(ppkMetadataAction(metadata));
            dispatch(rttStartAction());
            logger.info('PPK started');
        } catch (err) {
            logger.error('Failed to start the PPK.');
            logger.debug(err);
            dispatch({ type: 'DEVICE_DESELECTED' });
        }
    };
}

export function ppkUpdateRegulator() {
    /* eslint-disable no-bitwise */
    return async (dispatch, getState) => {
        const rttresults = [];
        const targetVdd = getState().app.voltageRegulator.vdd;
        const VddHighByte = (targetVdd >> 8);
        const VddLowByte = (targetVdd & 0xFF);

        rttresults.push(Transport.PPKCommandSend([
            PPKCmd.RegulatorSet, VddHighByte, VddLowByte,
        ]));

        await Promise.all(rttresults);
        dispatch(ppkUpdateRegulatorAction(targetVdd));
    };
}

export function ppkToggleDUT(isOn) {
    return async dispatch => {
        if (isOn) {
            await Transport.PPKCommandSend([PPKCmd.DutToggle, 0]);
            logger.info('DUT OFF');
        } else {
            await Transport.PPKCommandSend([PPKCmd.DutToggle, 1]);
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

        await Transport.PPKCommandSend([
            PPKCmd.ResUserSet,
            lowbytes[0], lowbytes[1], lowbytes[2], lowbytes[3],
            midbytes[0], midbytes[1], midbytes[2], midbytes[3],
            highbytes[0], highbytes[1], highbytes[2], highbytes[3],
        ]);

        Transport.setResistors(low, mid, high);
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

        await Transport.PPKCommandSend([
            PPKCmd.ResUserSet,
            lowbytes[0], lowbytes[1], lowbytes[2], lowbytes[3],
            midbytes[0], midbytes[1], midbytes[2], midbytes[3],
            highbytes[0], highbytes[1], highbytes[2], highbytes[3],
        ]);
        Transport.setResistors(low, mid, high);
        dispatch(resistorsResetAction());
    };
}

export function spikeFilteringToggle() {
    return async (dispatch, getState) => {
        if (getState().app.switchingPoints.spikeFiltering === false) {
            await Transport.PPKCommandSend([PPKCmd.SpikeFilteringOn]);
        } else {
            await Transport.PPKCommandSend([PPKCmd.SpikeFilteringOff]);
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
        Transport.PPKCommandSend([PPKCmd.SwitchPointUp, vrefUpMSB, vrefUpLSB]);
        dispatch(ppkSwitchingPointsUpSetAction());
    };
}

export function ppkSwitchingPointsDownSet() {
    return async (dispatch, getState) => {
        const sliderVal = getState().app.switchingPoints.switchDownSliderPosition;
        const pot = (2000.0 * (((16.3 * (500 - sliderVal)) / 100.0) - 1)) - 30000.0;
        const vrefDownMSB = parseInt((pot / 2), 10) >> 8;
        const vrefDownLSB = parseInt((pot / 2), 10) & 0xFF;
        Transport.PPKCommandSend([PPKCmd.SwitchPointDown, vrefDownMSB, vrefDownLSB]);
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
