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

import SerialPort from 'serialport';
import { logger } from 'nrfconnect/core';

import * as RTT from './rtt';
import microseconds from '../utils/timestamp';

export const PPK = {
    port: null,
};
const transport = 'rtt';

const ADC_SAMPLING_TIME_US = (transport === 'uart' ? 18 : 10);
const SAMPLES_PER_AVERAGE = 14;
const TRIGGER_SAMPLES_PER_SECOND = 1e6 / ADC_SAMPLING_TIME_US;
const AVERAGE_SAMPLES_PER_SECOND = 1e6 / (ADC_SAMPLING_TIME_US * SAMPLES_PER_AVERAGE);
const BUFFER_LENGTH_IN_SECONDS = 20;

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
    data: new Float32Array(AVERAGE_SAMPLES_PER_SECOND * BUFFER_LENGTH_IN_SECONDS).fill(0),
    index: 0,
    timestamp: 0,
    samplesPerSecond: AVERAGE_SAMPLES_PER_SECOND,
    color: 'rgba(179, 40, 96, 1)',
    valueRange: {
        min: -1,
        max: 15000,
    },
};

function ppkOpenedAction(portName) {
    return {
        type: 'PPK_OPENED',
        portName,
    };
}

function ppkClosedAction() {
    return {
        type: 'PPK_CLOSED',
    };
}

function ppkMetadataAction(metadata) {
    return {
        type: 'PPK_METADATA',
        metadata,
    };
}

function ppkAnimationAction() {
    return {
        type: 'PPK_ANIMATION',
        averageIndex: averageOptions.index,
        triggerIndex: triggerOptions.index,
    };
}

function ppkToggleDUTAction() {
    return {
        type: 'DEVICE_UNDER_TEST_TOGGLE',
    };
}

function ppkTriggerValueSetAction(triggerVal, triggerUnit) {
    return {
        type: 'TRIGGER_VALUE_SET',
        triggerVal,
        triggerUnit,
    };
}

function ppkToggleTriggerAction(triggerRunning) {
    return {
        type: 'TRIGGER_TOGGLE',
        triggerRunning,
    };
}

function ppkTriggerSingleSetAction() {
    return {
        type: 'TRIGGER_SINGLE_SET',
    };
}

function ppkDataReceivedAction() {
    return {
        type: 'TRIGGER_SINGLE_CLEAR',
    };
}

function rttStartAction() {
    return {
        type: 'RTT_CALLED_START',
    };
}

function rttStopAction() {
    return {
        type: 'RTT_CALLED_STOP',
    };
}

function ppkUpdateRegulatorAction(currentVDD) {
    return {
        type: 'VOLTAGE_REGULATOR_UPDATED',
        currentVDD,
    };
}

function convertFloatToByteBuffer(floatnum) {
    const float = new Float32Array(1);
    float[0] = floatnum;
    const bytes = new Uint8Array(float.buffer);

    return bytes;
}

export function close() {
    return dispatch => new Promise(resolve => {
        RTT.stop();
        RTT.events.removeAllListeners();
        PPK.port.close(err => {
            if (err) {
                logger.error(err);
            }
            dispatch(ppkClosedAction());
            logger.info('PPK closed');
            PPK.port = null;
            resolve();
        });
    });
}

export function open(serialPort) {
    return async dispatch => {
        if (PPK.port) {
            await dispatch(close());
        }

        PPK.port = new SerialPort(serialPort.comName, {
            baudRate: 1000000,
            rtscts: true,
        }, err => {
            if (err) {
                console.log(err.message);
                logger.info('Failed to open port, continuing...');
                dispatch(ppkClosedAction(serialPort.comName));
            } else {
                dispatch(ppkOpenedAction(serialPort.comName));
            }
        });
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

        const insertValue = (options, value) => {
            const opts = options;
            opts.data[options.index] = value;
            opts.index += 1;
            opts.timestamp = microseconds();
            if (opts.index === options.data.length) {
                opts.index = 0;
            }
            updateChart();
        };

        RTT.events.on('average', insertValue.bind(this, averageOptions));

        RTT.events.on('trigger', triggerData => {
            triggerOptions.data = triggerData;
            triggerOptions.index += 1;
            triggerOptions.timestamp = ADC_SAMPLING_TIME_US * triggerData.length;
            updateChart();
            dispatch(ppkDataReceivedAction());
        });

        const metadata = await RTT.read(0, 200);
        dispatch(ppkMetadataAction(metadata.split('\r\n')));
    };
}

export function start() {
    return async dispatch => {
        triggerOptions.data.fill(0);
        triggerOptions.index = 0;
        averageOptions.data.fill(0);
        averageOptions.index = 0;
        logger.info('RTT starting...');
        await RTT.start();
        dispatch(rttStartAction());
        logger.info('RTT started');
    };
}

export function stop() {
    return async dispatch => {
        RTT.stop();
        logger.info('RTT stopped');
        dispatch(rttStopAction());
    };
}

export function ppkUpdateRegulator(milliVolt) {
    /* eslint-disable no-bitwise */
    return async (dispatch, getState) => {
        let currentVDD = getState().app.voltageRegulator.currentVDD;
        const targetVdd = getState().app.voltageRegulator.vdd;
        console.log('current vdd: ', currentVDD);
        console.log('millivolt: ', milliVolt);
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
            RTT.PPKCommandSend([RTT.PPKCmd.RegulatorSet, VddHighByte, VddLowByte]);
            currentVDD = newValue;
        }
        console.log('New value: ', newValue);
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
    const triggerWindowMicroSec = value * 1000;
    let PPKtriggerWindow = triggerWindowMicroSec / ADC_SAMPLING_TIME_US;
    // If division returns a decimal, round downward to nearest integer
    PPKtriggerWindow = Math.floor(PPKtriggerWindow);
    const triggerHigh = PPKtriggerWindow >> 8;
    const triggerLow = PPKtriggerWindow & 0xFF;
    RTT.PPKCommandSend([RTT.PPKCmd.TriggerWindowSet, triggerHigh, triggerLow]);
    logger.info('Trigger window updated');
}
/*
 *   TODO: Can fetch this from state or
 * function call to triggerToggle. Bence ?
 */
let mtriggerVal = 3;
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
        RTT.PPKCommandSend([RTT.PPKCmd.TriggerSet, high, mid, low]);

        /*  Store to let triggerToggle use it
        *   TODO: Can fetch this from state or
        *   function call to triggerToggle. Bence?
        */
        mtriggerUnit = triggerUnit;
        mtriggerVal = triggerVal;

        dispatch(ppkTriggerValueSetAction(triggerVal, triggerUnit));
    };
}

export function ppkTriggerToggle() {
    return async (dispatch, getState) => {
        let triggerRunning = getState().app.trigger.triggerRunning;

        if (triggerRunning) {
            logger.info('Stopping trigger');
            RTT.PPKCommandSend([RTT.PPKCmd.TriggerStop]);
            triggerRunning = false;
            dispatch(ppkToggleTriggerAction(triggerRunning));
        } else {
            logger.info('Starting trigger');
            triggerRunning = true;
            dispatch(ppkTriggerSet(mtriggerVal, mtriggerUnit));
        }
    };
}

export function ppkTriggerSingleSet() {
    return async dispatch => {
        logger.info('Setting single trigger');
        RTT.PPKCommandSend([RTT.PPKCmd.TriggerSingleSet]);
        dispatch(ppkTriggerSingleSetAction());
    };
}

export function ppkToggleDUT(isOn) {
    return async dispatch => {
        if (isOn) {
            RTT.PPKCommandSend([RTT.PPKCmd.DutToggle, 0]);
            logger.info('DUT OFF');
        } else {
            RTT.PPKCommandSend([RTT.PPKCmd.DutToggle, 1]);
            logger.info('DUT ON');
        }
        dispatch(ppkToggleDUTAction());
    };
}

export function updateResistors() {
    return async (dispatch, getState) => {
        const low = getState().app.resistorCalibration.resLo;
        const mid = getState().app.resistorCalibration.resMid;
        const high = getState().app.resistorCalibration.resHi;

        const lowbytes = convertFloatToByteBuffer(low);
        const midbytes = convertFloatToByteBuffer(mid);
        const highbytes = convertFloatToByteBuffer(high);

        RTT.PPKCommandSend([
            RTT.PPKCmd.ResUserSet,
            lowbytes[0], lowbytes[1], lowbytes[2], lowbytes[3],
            midbytes[0], midbytes[1], midbytes[2], midbytes[3],
            highbytes[0], highbytes[1], highbytes[2], highbytes[3],
        ]);
    };
}
// // function averageToggle(buttonVal) {
// //     if (buttonVal === 'start') {
// //         RTT.PPKCommandSend([RTT.PPKCmd.AverageStop]);
// //     } else {
// //         RTT.PPKCommandSend([RTT.PPKCmd.AverageStart]);
// //     }
// // }


// // function externalTriggerToggled(chbState) {
// //     const isEnabled = chbState;
// //     gui.triggerStartButton.setText('Start');

// //     if (isEnabled) {
// //         gui.triggerleveltextbox.setDisabled();
// //         gui.triggerStartButton.setDisabled();
// //         gui.triggerSingleButton.setDisabled();
// //         RTT.PPKCommandSend([RTT.PPKCmd.TriggerStop]);
// //     } else {
// //         gui.triggerleveltextbox.setEnabled();
// //         gui.triggerStartButton.setEnabled();
// //         gui.triggerSingleButton.setEnabled();
// //     }
// //     RTT.PPKCommandSend([RTT.PPKCmd.TriggerExtToggle]);
// // }
