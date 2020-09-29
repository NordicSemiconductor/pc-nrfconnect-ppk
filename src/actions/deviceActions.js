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

/* eslint-disable no-bitwise */

import { logger } from 'nrfconnect/core';
import isDev from 'electron-is-dev';
import Device from '../device';
import persistentStore from '../utils/persistentStore';

import {
    deviceOpenedAction,
    deviceClosedAction,
    rttStartAction,
    toggleDUTAction,
    setPowerModeAction,
    samplingStartAction,
    samplingStoppedAction,
} from '../reducers/appReducer';
import {
    switchingPointsResetAction,
    switchingPointsDownSetAction,
    spikeFilteringToggleAction,
} from '../reducers/switchingPointsReducer';
import {
    toggleTriggerAction,
    clearSingleTriggingAction,
    triggerLevelSetAction,
    triggerSingleSetAction,
    externalTriggerToggledAction,
} from '../reducers/triggerReducer';
import { updateRegulatorAction } from '../reducers/voltageRegulatorReducer';
import { resistorsResetAction } from '../reducers/resistorCalibrationReducer';
import {
    chartWindowAction,
    animationAction,
    chartCursorAction,
    updateHasDigitalChannels,
    goLive,
} from '../reducers/chartReducer';
import { options, bufferLengthInSeconds, updateTitle } from '../globals';
import { updateGainsAction } from '../reducers/gainsReducer';

let device = null;
let updateRequestInterval;

const zeroCap = isDev ? n => n : n => Math.max(0, n);

const setupOptions = () => dispatch => {
    options.samplingTime = device.adcSamplingTimeUs;
    options.samplesPerSecond = 1e6 / options.samplingTime;
    const bufferLength = Math.trunc(
        options.samplesPerSecond * bufferLengthInSeconds
    );
    if (device.capabilities.ppkSetPowerMode) {
        if (!options.bits || options.bits.length !== bufferLength) {
            options.bits = new Uint8Array(bufferLength);
        }
        options.bits.fill(0);
        options.triggerMarkers = null;
    } else {
        options.bits = null;
        options.triggerMarkers = [];
    }
    if (options.data.length !== bufferLength) {
        options.data = new Float32Array(bufferLength);
    }
    options.data.fill(NaN);
    options.index = 0;
    options.timestamp = 0;
    dispatch(updateHasDigitalChannels());
};

/* Start reading current measurements */
export function samplingStart() {
    return async (dispatch, getState) => {
        options.data.fill(NaN);
        if (options.bits) {
            options.bits.fill(0);
        }
        options.index = 0;
        options.timestamp = undefined;
        if (options.triggerMarkers) {
            options.triggerMarkers = [];
        }
        dispatch(
            chartWindowAction(null, null, getState().app.chart.windowDuration),
            null,
            null
        );
        dispatch(chartCursorAction(null, null));
        dispatch(samplingStartAction());
        await device.ppkAverageStart();
        logger.info('Sampling started');
    };
}

export function samplingStop() {
    return async dispatch => {
        dispatch(samplingStoppedAction());
        await device.ppkAverageStop();
        logger.info('Sampling stopped');
    };
}

export function triggerStop() {
    return async dispatch => {
        if (!device.capabilities.ppkTriggerStop) {
            return;
        }
        logger.info('Stopping trigger');
        await device.ppkTriggerStop();
        dispatch(toggleTriggerAction(false));
        dispatch(clearSingleTriggingAction());
    };
}

export const updateSpikeFilter = () => async (_, getState) => {
    if (!device.ppkSetSpikeFilter) {
        return;
    }
    const { spikeFilter } = getState().app;
    const { samples, alpha, alpha4 } = spikeFilter;
    persistentStore.set('spikeFilter.samples', samples);
    persistentStore.set('spikeFilter.alpha', alpha);
    persistentStore.set('spikeFilter.alpha4', alpha4);
    await device.ppkSetSpikeFilter(spikeFilter);
    logger.info(
        `Spike filter: smooth ${samples} samples with ${alpha} coefficient (${alpha4} in range 4)`
    );
};

export function close() {
    return async (dispatch, getState) => {
        clearInterval(updateRequestInterval);
        if (!device) {
            return;
        }
        if (getState().app.app.samplingRunning) {
            await dispatch(samplingStop());
        }
        if (getState().app.trigger.triggerRunning) {
            await dispatch(triggerStop());
        }
        await device.stop();
        device.removeAllListeners();
        device = null;
        dispatch(deviceClosedAction());
        dispatch(triggerLevelSetAction(null));
        logger.info('PPK closed');
        updateTitle();
    };
}

const initGains = () => async dispatch => {
    if (!device.capabilities.ppkSetUserGains) {
        return;
    }
    const { ug } = device.modifiers;
    // if any value is ug is outside of [0.9..1.1] range:
    if (ug.reduce((p, c) => Math.abs(c - 1) > 0.1 || p, false)) {
        logger.info(
            'Found out of range user gain, setting all gains back to 1.0'
        );
        ug.splice(0, 5, 1, 1, 1, 1, 1);
        await device.ppkSetUserGains(0, ug[0]);
        await device.ppkSetUserGains(1, ug[1]);
        await device.ppkSetUserGains(2, ug[2]);
        await device.ppkSetUserGains(3, ug[3]);
        await device.ppkSetUserGains(4, ug[4]);
    }
    [0, 1, 2, 3, 4].forEach(n => dispatch(updateGainsAction(ug[n] * 100, n)));
};

export function open(deviceInfo) {
    return async (dispatch, getState) => {
        if (getState().app.portName) {
            await dispatch(close());
        }

        const onSample = ({
            value,
            bits,
            timestamp,
            trigger = false,
            triggerMarker = false,
        }) => {
            if (options.timestamp === undefined) {
                options.timestamp = 0;
            }
            const { samplingRunning } = getState().app.app;
            const { windowBegin, windowEnd } = getState().app.chart;
            if (!samplingRunning && !trigger) {
                // skip incoming data after stopped
                return;
            }

            if (trigger && getState().app.trigger.triggerSingleWaiting) {
                logger.info('Trigger received, stopped waiting');
                dispatch(clearSingleTriggingAction());
            }

            const zeroCappedValue = zeroCap(value);

            if (timestamp) {
                if (triggerMarker) {
                    options.triggerMarkers.push(
                        timestamp - options.samplingTime
                    );
                }

                let ts = options.timestamp;
                while (ts > timestamp - options.samplingTime) {
                    ts -= options.samplingTime;
                    options.data[options.index] = NaN;
                    options.index -= 1;
                    if (options.index === -1) {
                        options.index = options.data.length - 1;
                    }
                }
                ts = options.timestamp;
                while (ts < timestamp - options.samplingTime) {
                    ts += options.samplingTime;
                    options.data[options.index] = NaN;
                    options.index += 1;
                    if (options.index === options.data.length) {
                        options.index = 0;
                    }
                }
                options.data[options.index] = zeroCappedValue;
                options.index += 1;
                options.timestamp = timestamp;
            } else {
                options.data[options.index] = zeroCappedValue;
                options.bits[options.index] = bits;
                options.index += 1;
                options.timestamp += options.samplingTime;
            }

            if (options.index === options.data.length) {
                options.index = 0;
            }

            if (
                (windowBegin !== 0 || windowEnd !== 0) &&
                options.timestamp >= windowBegin + bufferLengthInSeconds * 1e6
            ) {
                // stop average when reaches end of buffer (i.e. would overwrite chart data)
                dispatch(samplingStop());
            }
        };

        try {
            device = new Device(deviceInfo, onSample);
            dispatch(setupOptions());
            const metadata = device.parseMeta(await device.start());

            console.log(metadata);
            dispatch(resistorsResetAction(metadata));
            dispatch(switchingPointsResetAction(metadata));
            if (device.capabilities.ppkTriggerSet) {
                dispatch(triggerLevelSetAction(1000));
            } else {
                dispatch(triggerLevelSetAction(null));
            }
            await device.ppkUpdateRegulator(metadata.vdd);
            dispatch(
                updateRegulatorAction({
                    vdd: metadata.vdd,
                    currentVDD: metadata.vdd,
                    ...device.vddRange,
                })
            );
            await dispatch(initGains());
            if (device.capabilities.ppkSetSpikeFilter) {
                dispatch(updateSpikeFilter());
            }
            if (device.capabilities.ppkSetPowerMode) {
                // 1 = Ampere
                // 2 = SMU
                dispatch(setPowerModeAction(metadata.mode === 2));
            }
            dispatch(rttStartAction());
            logger.info('PPK started');
        } catch (err) {
            logger.error('Failed to start PPK');
            logger.debug(err);
            dispatch({ type: 'DEVICE_DESELECTED' });
        }

        dispatch(
            deviceOpenedAction(deviceInfo.serialNumber, device.capabilities)
        );

        logger.info('PPK opened');
        updateTitle(deviceInfo.serialNumber);

        device.on('error', (message, error) => {
            logger.error(message);
            if (error) {
                dispatch(close());
                logger.debug(error);
            }
        });

        clearInterval(updateRequestInterval);
        let renderIndex;
        updateRequestInterval = setInterval(() => {
            if (renderIndex !== options.index) {
                requestAnimationFrame(() => dispatch(animationAction()));
                renderIndex = options.index;
            }
        }, 30);
    };
}

export function updateRegulator() {
    return async (dispatch, getState) => {
        const { vdd } = getState().app.voltageRegulator;
        await device.ppkUpdateRegulator(vdd);
        logger.info(`Voltage regulator updated to ${vdd} mV`);
        dispatch(updateRegulatorAction({ currentVdd: vdd }));
    };
}

export const updateGains = index => async (_, getState) => {
    if (!device.ppkSetUserGains) {
        return;
    }
    const { gains } = getState().app;
    const gain = gains[index] / 100;
    await device.ppkSetUserGains(index, gain);
    logger.info(`Gain multiplier #${index + 1} updated to ${gain}`);
};

/**
 * Takes the window value in milliseconds, adjusts for microsecs
 * and resolves the number of bytes we need for this size of window.
 * @param {number} value  Value received in milliseconds
 * @returns {null} Nothing
 */
export function triggerLengthUpdate(value) {
    return async () => {
        const triggerLengthMicroSec = value * 1000;
        const triggerLength = Math.floor(
            triggerLengthMicroSec / options.samplingTime
        );
        // If division returns a decimal, round downward to nearest integer
        await device.ppkTriggerWindowSet(triggerLength);
        logger.info(`Trigger length updated to ${value} ms`);
    };
}

export function triggerStart() {
    return async (dispatch, getState) => {
        dispatch(goLive());
        dispatch(toggleTriggerAction(true));
        dispatch(clearSingleTriggingAction());

        const { triggerLevel } = getState().app.trigger;
        logger.info(`Starting trigger at ${triggerLevel} \u00B5A`);
        const high = (triggerLevel >> 16) & 0xff;
        const mid = (triggerLevel >> 8) & 0xff;
        const low = triggerLevel & 0xff;

        await device.ppkTriggerSet(high, mid, low);
        dispatch(toggleTriggerAction(true));
    };
}

export function triggerSingleSet() {
    return async (dispatch, getState) => {
        dispatch(goLive());
        const { triggerLevel } = getState().app.trigger;
        logger.info(`Waiting for single trigger at ${triggerLevel} \u00B5A`);
        const high = (triggerLevel >> 16) & 0xff;
        const mid = (triggerLevel >> 8) & 0xff;
        const low = triggerLevel & 0xff;

        await device.ppkTriggerSingleSet(high, mid, low);
        dispatch(triggerSingleSetAction());
    };
}

export function toggleDUT(isOn) {
    return async dispatch => {
        await device.ppkToggleDUT(isOn ? 0 : 1);
        logger.info(`DUT ${isOn ? 'ON' : 'OFF'}`);
        dispatch(toggleDUTAction());
    };
}

export function setPowerMode(isSmuMode) {
    return async dispatch => {
        await device.ppkSetPowerMode(isSmuMode ? 2 : 1);
        logger.info(`Mode: ${isSmuMode ? 'Source meter' : 'Ampere meter'}`);
        dispatch(setPowerModeAction(isSmuMode));
    };
}

export function updateResistors() {
    return async (_, getState) => {
        const {
            userResLo,
            userResMid,
            userResHi,
        } = getState().app.resistorCalibration;
        logger.info(`Resistors set to ${userResLo}/${userResMid}/${userResHi}`);
        await device.ppkUpdateResistors(userResLo, userResMid, userResHi);
    };
}

export function resetResistors() {
    return async (dispatch, getState) => {
        const { resLo, resMid, resHi } = getState().app.resistorCalibration;
        logger.info(`Resistors reset to ${resLo}/${resMid}/${resHi}`);
        await device.ppkUpdateResistors(resLo, resMid, resHi);
        dispatch(resistorsResetAction());
    };
}

export function externalTriggerToggled(chbState) {
    return async dispatch => {
        if (chbState) {
            await device.ppkTriggerStop();
            logger.info('Starting external trigger');
        } else {
            logger.info('Stopping external trigger');
        }
        await device.ppkTriggerExtToggle();
        dispatch(externalTriggerToggledAction());
    };
}

export function spikeFilteringToggle() {
    return async (dispatch, getState) => {
        if (getState().app.switchingPoints.spikeFiltering === false) {
            await device.ppkSpikeFilteringOn();
        } else {
            await device.ppkSpikeFilteringOff();
        }
        dispatch(spikeFilteringToggleAction());
    };
}

export function switchingPointsUpSet() {
    return async (_, getState) => {
        const { switchUpSliderPosition } = getState().app.switchingPoints;
        const pot =
            13500.0 * ((10.98194 * switchUpSliderPosition) / 1000 / 0.41 - 1);
        await device.ppkSwitchPointUp(parseInt(pot, 10));
    };
}

export function switchingPointsDownSet() {
    return async (dispatch, getState) => {
        const { switchDownSliderPosition } = getState().app.switchingPoints;
        const pot =
            2000.0 * ((16.3 * (500 - switchDownSliderPosition)) / 100.0 - 1) -
            30000.0;
        await device.ppkSwitchPointDown(parseInt(pot / 2, 10));
        dispatch(switchingPointsDownSetAction(switchDownSliderPosition));
    };
}

export function switchingPointsReset() {
    return async dispatch => {
        // Reset state of slider to initial values
        dispatch(switchingPointsResetAction());
        // Set these initial values in hardware
        await dispatch(switchingPointsUpSet());
        await dispatch(switchingPointsDownSet());
    };
}

export function updateTriggerLevel(level) {
    return async (dispatch, getState) => {
        const triggerLevel = Math.round(level);
        const { triggerSingleWaiting, triggerRunning } = getState().app.trigger;
        dispatch(triggerLevelSetAction(triggerLevel));

        const high = (triggerLevel >> 16) & 0xff;
        const mid = (triggerLevel >> 8) & 0xff;
        const low = triggerLevel & 0xff;

        if (triggerSingleWaiting) {
            logger.info(`Trigger level updated to ${triggerLevel} \u00B5A`);
            await device.ppkTriggerSingleSet(high, mid, low);
        } else if (triggerRunning) {
            logger.info(`Trigger level updated to ${triggerLevel} \u00B5A`);
            await device.ppkTriggerSet(high, mid, low);
        }
    };
}
