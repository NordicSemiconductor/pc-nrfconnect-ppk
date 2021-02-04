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

import isDev from 'electron-is-dev';
import { logger } from 'pc-nrfconnect-shared';

import Device from '../device';
import { device, options, setDevice, updateTitle } from '../globals';
import {
    deviceClosedAction,
    deviceOpenedAction,
    rttStartAction,
    setDeviceRunningAction,
    setFileLoadedAction,
    setPowerModeAction,
} from '../reducers/appReducer';
import {
    animationAction,
    chartWindowUnLockAction,
    updateHasDigitalChannels,
} from '../reducers/chartReducer';
import { setSamplingAttrsAction } from '../reducers/dataLoggerReducer';
import { updateGainsAction } from '../reducers/gainsReducer';
import { resistorsResetAction } from '../reducers/resistorCalibrationReducer';
import {
    spikeFilteringToggleAction,
    switchingPointsDownSetAction,
    switchingPointsResetAction,
} from '../reducers/switchingPointsReducer';
import {
    setTriggerOriginAction,
    triggerLevelSetAction,
} from '../reducers/triggerReducer';
import { updateRegulatorAction } from '../reducers/voltageRegulatorReducer';
import { convertBits16 } from '../utils/bitConversion';
import { isRealTimePane } from '../utils/panes';
import persistentStore from '../utils/persistentStore';
import { samplingStop } from './samplingActions';
import {
    initialiseDataLoggerPane,
    initialiseGlobalOptions,
    initialiseRealTimePane,
} from './setupActions';
import {
    initialiseTriggerSettings,
    processTriggerSample,
    triggerStop,
} from './triggerActions';

let updateRequestInterval;

export const setupOptions = () => (dispatch, getState) => {
    if (!device) return;
    const bufferLengthInSeconds = dispatch(
        isRealTimePane(getState())
            ? initialiseRealTimePane(device.adcSamplingTimeUs)
            : initialiseDataLoggerPane()
    );
    initialiseGlobalOptions(
        device.capabilities.ppkSetPowerMode,
        bufferLengthInSeconds
    );
    dispatch(chartWindowUnLockAction());
    dispatch(setTriggerOriginAction(null));
    dispatch(updateHasDigitalChannels());
    dispatch(animationAction());
};

export const updateSpikeFilter = () => async (_, getState) => {
    if (!device.ppkSetSpikeFilter) {
        return;
    }
    const { spikeFilter } = getState().app;
    const { samples, alpha, alpha5 } = spikeFilter;
    persistentStore.set('spikeFilter.samples', samples);
    persistentStore.set('spikeFilter.alpha', alpha);
    persistentStore.set('spikeFilter.alpha5', alpha5);
    await device.ppkSetSpikeFilter(spikeFilter);
    if (getState().app.app.advancedMode) {
        logger.info(
            `Spike filter: smooth ${samples} samples with ${alpha} coefficient (${alpha5} in range 5)`
        );
    }
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
            'Found out-of-range user gain, setting all gains back to 1.0'
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

const zeroCap = isDev ? n => n : n => Math.max(0, n);

const onSample = (dispatch, getState) => {
    let prevValue = 0;
    let prevBits = 0;
    let nbSamples = 0;
    let nbSamplesTotal = 0;

    return ({ value, bits, endOfTrigger }) => {
        if (options.timestamp === undefined) {
            options.timestamp = 0;
        }

        const {
            app: { samplingRunning },
            dataLogger: { maxSampleFreq, sampleFreq },
            trigger: {
                triggerRunning,
                triggerStartIndex,
                triggerSingleWaiting,
            },
        } = getState().app;
        if (
            !triggerRunning &&
            !samplingRunning &&
            !triggerStartIndex &&
            !triggerSingleWaiting
        ) {
            return;
        }

        let zeroCappedValue = zeroCap(value);
        const b16 = convertBits16(bits);

        if (samplingRunning && sampleFreq < maxSampleFreq) {
            const samplesPerAverage = maxSampleFreq / sampleFreq;
            nbSamples += 1;
            nbSamplesTotal += 1;
            const f = Math.min(nbSamplesTotal, samplesPerAverage);
            if (prevValue !== undefined && value !== undefined) {
                zeroCappedValue = prevValue + (zeroCappedValue - prevValue) / f;
            }
            if (nbSamples < samplesPerAverage) {
                if (value !== undefined) {
                    prevValue = zeroCappedValue;
                    prevBits |= b16;
                }
                return;
            }
            nbSamples = 0;
        }

        options.data[options.index] = zeroCappedValue;
        if (options.bits) {
            options.bits[options.index] = b16 | prevBits;
            prevBits = 0;
        }
        options.index += 1;
        options.timestamp += options.samplingTime;

        if (options.index === options.data.length) {
            if (samplingRunning) {
                dispatch(samplingStop());
            }
            options.index = 0;
        }
        if (triggerRunning || triggerSingleWaiting) {
            dispatch(
                processTriggerSample(value, {
                    samplingTime: options.samplingTime,
                    dataIndex: options.index,
                    dataBuffer: options.data,
                    endOfTrigger,
                })
            );
        }
    };
};

export function open(deviceInfo) {
    return async (dispatch, getState) => {
        if (getState().app.portName) {
            await dispatch(close());
        }

        try {
            setDevice(new Device(deviceInfo, onSample(dispatch, getState)));
            dispatch(
                setSamplingAttrsAction(
                    device.capabilities.maxContinuousSamplingTimeUs
                )
            );
            dispatch(setupOptions());
            dispatch(setDeviceRunningAction(device.isRunningInitially));
            const metadata = device.parseMeta(await device.start());

            dispatch(initialiseTriggerSettings());
            dispatch(resistorsResetAction(metadata));
            dispatch(switchingPointsResetAction(metadata));
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
                const isSmuMode = metadata.mode === 2;
                // 1 = Ampere
                // 2 = SMU
                dispatch(setPowerModeAction(isSmuMode));
                if (!isSmuMode) dispatch(setDeviceRunning(true));
            }

            dispatch(rttStartAction());
            dispatch(setFileLoadedAction(false));

            logger.info('PPK started');
        } catch (err) {
            console.log(err);
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
            if (
                renderIndex !== options.index &&
                getState().app.app.samplingRunning
            ) {
                requestAnimationFrame(() => {
                    dispatch(animationAction());
                });
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

export function setDeviceRunning(isRunning) {
    return async dispatch => {
        await device.ppkDeviceRunning(isRunning ? 1 : 0);
        logger.info(`DUT ${isRunning ? 'ON' : 'OFF'}`);
        dispatch(setDeviceRunningAction(isRunning));
    };
}

export function setPowerMode(isSmuMode) {
    return async dispatch => {
        logger.info(`Mode: ${isSmuMode ? 'Source meter' : 'Ampere meter'}`);
        if (isSmuMode) {
            await dispatch(setDeviceRunning(false));
            await device.ppkSetPowerMode(true); // set to source mode
            dispatch(setPowerModeAction(true));
        } else {
            await device.ppkSetPowerMode(false); // set to ampere mode
            dispatch(setPowerModeAction(false));
            await dispatch(setDeviceRunning(true));
        }
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
