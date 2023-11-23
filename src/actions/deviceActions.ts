/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO: Remove, only added for conservative refactoring to typescript */

import {
    Device,
    isDevelopment,
    logger,
    usageData,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import SerialDevice from '../device/serialDevice';
import { SampleValues } from '../device/types';
import {
    miniMapAnimationAction,
    resetMinimap,
} from '../features/minimap/minimapSlice';
import { startPreventSleep, stopPreventSleep } from '../features/preventSleep';
import { DataManager, indexToTimestamp, updateTitle } from '../globals';
import { RootState } from '../slices';
import {
    deviceClosedAction,
    deviceOpenedAction,
    samplingStartAction,
    samplingStoppedAction,
    setDeviceRunningAction,
    setFileLoadedAction,
    setPowerModeAction,
} from '../slices/appSlice';
import {
    animationAction,
    chartWindowAction,
    chartWindowUnLockAction,
    resetChartTime,
    resetCursorAndChart,
    updateHasDigitalChannels,
} from '../slices/chartSlice';
import { setSamplingAttrsAction } from '../slices/dataLoggerSlice';
import { updateGainsAction } from '../slices/gainsSlice';
import { TDispatch } from '../slices/thunk';
import {
    clearSingleTriggerWaitingAction,
    setTriggerOriginAction,
    toggleTriggerAction,
    triggerLengthSetAction,
    triggerLevelSetAction,
    triggerSingleSetAction,
    triggerWindowRangeAction,
} from '../slices/triggerSlice';
import { updateRegulator as updateRegulatorAction } from '../slices/voltageRegulatorSlice';
import EventAction from '../usageDataActions';
import { convertBits16 } from '../utils/bitConversion';
import { isRealTimePane } from '../utils/panes';
import { setSpikeFilter as persistSpikeFilter } from '../utils/persistentStore';
import { calculateWindowSize, processTriggerSample } from './triggerActions';

let device: null | SerialDevice = null;
let updateRequestInterval: NodeJS.Timeout | undefined;

const zeroCap = isDevelopment
    ? (n: number) => n
    : (n: number) => Math.max(0, n);

export const setupOptions =
    () => (dispatch: TDispatch, getState: () => RootState) => {
        if (!device) return;
        try {
            DataManager().reset();

            dispatch(resetChartTime());
            dispatch(resetMinimap());

            if (isRealTimePane(getState())) {
                // in real-time
                const realtimeWindowDuration = 300;
                const newSamplesPerSecond = 1e6 / device.adcSamplingTimeUs;
                DataManager().setSamplingRate(newSamplesPerSecond);
                DataManager().initializeDataBuffer(realtimeWindowDuration);
                DataManager().initializeBitsBuffer(realtimeWindowDuration);
            } else {
                const { durationSeconds, sampleFreq } =
                    getState().app.dataLogger;
                DataManager().setSamplingRate(sampleFreq);
                DataManager().initializeDataBuffer(durationSeconds);
                DataManager().initializeBitsBuffer(durationSeconds);
            }
        } catch (err) {
            logger.error(err);
        }
        dispatch(chartWindowUnLockAction());
        dispatch(setTriggerOriginAction(null));
        dispatch(updateHasDigitalChannels());
        dispatch(animationAction());
    };

// Only used by Data Logger Pane
/* Start reading current measurements */
export function samplingStart() {
    return async (dispatch: TDispatch, getState: () => RootState) => {
        usageData.sendUsageData(
            isRealTimePane(getState())
                ? EventAction.START_REAL_TIME_SAMPLE
                : EventAction.START_DATA_LOGGER_SAMPLE
        );
        usageData.sendUsageData(EventAction.SAMPLE_STARTED_WITH_PPK2_SELECTED);

        // Prepare global options
        dispatch(setupOptions());

        dispatch(resetCursorAndChart());
        dispatch(samplingStartAction());
        await device!.ppkAverageStart();
        startPreventSleep();
    };
}

export function samplingStop() {
    return async (dispatch: TDispatch) => {
        if (!device) return;
        dispatch(samplingStoppedAction());
        await device.ppkAverageStop();
        stopPreventSleep();
    };
}

export function triggerStop() {
    return async (dispatch: TDispatch) => {
        if (!device) return;
        logger.info('Stopping trigger');
        await device.ppkTriggerStop();
        dispatch(toggleTriggerAction(false));
        dispatch(clearSingleTriggerWaitingAction());
        stopPreventSleep();
    };
}

export const updateSpikeFilter =
    () => (_: TDispatch, getState: () => RootState) => {
        const { spikeFilter } = getState().app;
        persistSpikeFilter(spikeFilter);
        device!.ppkSetSpikeFilter(spikeFilter);
        if (getState().app.app.advancedMode) {
            const { samples, alpha, alpha5 } = spikeFilter;
            logger.info(
                `Spike filter: smooth ${samples} samples with ${alpha} coefficient (${alpha5} in range 5)`
            );
        }
    };

export function close() {
    return async (dispatch: TDispatch, getState: () => RootState) => {
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

const initGains = () => async (dispatch: TDispatch) => {
    if (!device!.capabilities.ppkSetUserGains) {
        return;
    }
    const { ug } = device!.modifiers;
    // if any value is ug is outside of [0.9..1.1] range:
    if (ug.reduce((p, c) => Math.abs(c - 1) > 0.1 || p, false)) {
        logger.info(
            'Found out-of-range user gain, setting all gains back to 1.0'
        );
        ug.splice(0, 5, 1, 1, 1, 1, 1);
        await device!.ppkSetUserGains(0, ug[0]);
        await device!.ppkSetUserGains(1, ug[1]);
        await device!.ppkSetUserGains(2, ug[2]);
        await device!.ppkSetUserGains(3, ug[3]);
        await device!.ppkSetUserGains(4, ug[4]);
    }
    [0, 1, 2, 3, 4].forEach(n =>
        dispatch(updateGainsAction({ value: ug[n] * 100, range: n }))
    );
};

export const open =
    (deviceInfo: Device) =>
    async (dispatch: TDispatch, getState: () => RootState) => {
        // TODO: Check if this is right?
        // Is this suppose to be run when another device is already connected?
        // Seems like it closes old device somewhere else first, meaning this is redundant.
        if (getState().app.app.portName) {
            await dispatch(close());
        }

        let prevValue = 0;
        let prevBits = 0;
        let nbSamples = 0;
        let nbSamplesTotal = 0;

        const initializeChartForRealTime = () => {
            const { triggerLength } = getState().app.trigger;
            const windowSize = calculateWindowSize(
                triggerLength,
                DataManager().getSamplingTime()
            );
            const end = indexToTimestamp(windowSize);
            dispatch(chartWindowAction(end, windowSize)); // TODO test this
        };

        const onSample = ({ value, bits }: SampleValues) => {
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

            let zeroCappedValue = zeroCap(value!);
            const b16 = convertBits16(bits!);

            if (samplingRunning && sampleFreq < maxSampleFreq) {
                const samplesPerAverage = maxSampleFreq / sampleFreq;
                nbSamples += 1;
                nbSamplesTotal += 1;
                const f = Math.min(nbSamplesTotal, samplesPerAverage);
                if (Number.isFinite(value) && Number.isFinite(prevValue)) {
                    zeroCappedValue =
                        prevValue + (zeroCappedValue - prevValue) / f;
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

            if (
                DataManager().addData(zeroCappedValue, b16 | prevBits)
                    .bitDataAdded
            ) {
                prevBits = 0;
            }

            if (DataManager().isBufferFull()) {
                if (samplingRunning) {
                    dispatch(samplingStop());
                }
            }
            if (triggerRunning || triggerSingleWaiting) {
                dispatch(
                    processTriggerSample(value!, device!, {
                        samplingTime: DataManager().getSamplingTime(),
                        dataIndex: DataManager().getTotalSavedRecords(),
                    })
                );
            }
        };

        try {
            device = new SerialDevice(deviceInfo, onSample);
            usageData.sendUsageData(EventAction.PPK_2_SELECTED);

            dispatch(
                setSamplingAttrsAction({
                    maxContiniousSamplingTimeUs:
                        device.capabilities.maxContinuousSamplingTimeUs!,
                })
            );
            dispatch(setupOptions());
            dispatch(
                setDeviceRunningAction({
                    isRunning: device.isRunningInitially,
                })
            );
            const metadata = device.parseMeta(await device.start());
            const { triggerLength, triggerLevel, triggerWindowRange } =
                getState().app.trigger;
            if (!triggerLength) await dispatch(triggerLengthUpdate(10));
            if (!triggerLevel) dispatch(triggerLevelSetAction(1000));
            if (!triggerWindowRange)
                dispatch(
                    triggerWindowRangeAction({ ...device.triggerWindowRange })
                );

            await device.ppkUpdateRegulator(metadata.vdd);
            dispatch(
                updateRegulatorAction({
                    vdd: metadata.vdd,
                    currentVDD: metadata.vdd,
                    ...device.vddRange,
                })
            );
            await dispatch(initGains());
            dispatch(updateSpikeFilter());
            const isSmuMode = metadata.mode === 2;
            // 1 = Ampere
            // 2 = SMU
            dispatch(setPowerModeAction({ isSmuMode }));
            if (!isSmuMode) dispatch(setDeviceRunning(true));

            dispatch(setFileLoadedAction({ loaded: false }));

            if (isRealTimePane(getState())) {
                initializeChartForRealTime();
            }

            logger.info('PPK started');
        } catch (err) {
            logger.error('Failed to start PPK');
            logger.debug(err);
            dispatch({ type: 'device/deselectDevice' });
        }

        dispatch(
            deviceOpenedAction({
                portName: deviceInfo.serialNumber,
                capabilities: device!.capabilities,
            })
        );

        logger.info('PPK opened');
        updateTitle(deviceInfo.serialNumber);

        device!.on('error', (message, error) => {
            logger.error(message);
            if (error) {
                dispatch(close());
                logger.debug(error);
            }
        });

        clearInterval(updateRequestInterval);
        let renderIndex: number;
        updateRequestInterval = setInterval(() => {
            if (
                renderIndex !== DataManager().getTotalSavedRecords() &&
                getState().app.app.samplingRunning
            ) {
                const timestamp = Date.now();
                if (getState().app.chart.liveMode) {
                    requestAnimationFrame(() => {
                        /*
                            requestAnimationFrame pauses when app is in the background.
                            If timestamp is more than 10ms ago, do not dispatch animationAction.
                        */
                        if (Date.now() - timestamp < 100) {
                            dispatch(animationAction());
                        }
                    });
                }

                requestAnimationFrame(() => {
                    /*
                        requestAnimationFrame pauses when app is in the background.
                        If timestamp is more than 10ms ago, do not dispatch animationAction.
                    */
                    if (Date.now() - timestamp < 100) {
                        dispatch(miniMapAnimationAction());
                    }
                });
                renderIndex = DataManager().getTotalSavedRecords();
            }
        }, 30);
    };

export function updateRegulator() {
    return async (dispatch: TDispatch, getState: () => RootState) => {
        const { vdd } = getState().app.voltageRegulator;
        await device!.ppkUpdateRegulator(vdd);
        logger.info(`Voltage regulator updated to ${vdd} mV`);
        dispatch(updateRegulatorAction({ currentVDD: vdd }));
    };
}

export const updateGains =
    (index: number) => async (_: TDispatch, getState: () => RootState) => {
        if (device!.ppkSetUserGains == null) {
            return;
        }
        const { gains } = getState().app;
        const gain = gains[index] / 100;
        await device!.ppkSetUserGains(index, gain);
        logger.info(`Gain multiplier #${index + 1} updated to ${gain}`);
    };

/**
 * Takes the window value in milliseconds, adjusts for microsecs
 * and resolves the number of bytes we need for this size of window.
 * @param {number} value  Value received in milliseconds
 * @returns {void} Nothing
 */
export function triggerLengthUpdate(value: number) {
    return (dispatch: TDispatch) => {
        dispatch(triggerLengthSetAction(value));
        logger.info(`Trigger length updated to ${value} ms`);
    };
}

export function triggerStart() {
    return async (dispatch: TDispatch, getState: () => RootState) => {
        dispatch(resetCursorAndChart());
        dispatch(toggleTriggerAction(true));
        dispatch(clearSingleTriggerWaitingAction());

        const { triggerLevel } = getState().app.trigger;
        logger.info(`Starting trigger at ${triggerLevel} \u00B5A`);

        await device!.ppkTriggerSet();
        startPreventSleep();
    };
}

export function triggerSingleSet() {
    return async (dispatch: TDispatch, getState: () => RootState) => {
        dispatch(resetCursorAndChart());
        dispatch(triggerSingleSetAction());

        const { triggerLevel } = getState().app.trigger;
        logger.info(`Waiting for single trigger at ${triggerLevel} \u00B5A`);

        await device!.ppkTriggerSingleSet();
        startPreventSleep();
    };
}

export function setDeviceRunning(isRunning: boolean) {
    return async (dispatch: TDispatch) => {
        await device!.ppkDeviceRunning(isRunning ? 1 : 0);
        logger.info(`DUT ${isRunning ? 'ON' : 'OFF'}`);
        dispatch(setDeviceRunningAction({ isRunning }));
    };
}

export function setPowerMode(isSmuMode: boolean) {
    return async (dispatch: TDispatch) => {
        logger.info(`Mode: ${isSmuMode ? 'Source meter' : 'Ampere meter'}`);
        if (isSmuMode) {
            await dispatch(setDeviceRunning(false));
            await device!.ppkSetPowerMode(true); // set to source mode
            dispatch(setPowerModeAction({ isSmuMode: true }));
        } else {
            await device!.ppkSetPowerMode(false); // set to ampere mode
            dispatch(setPowerModeAction({ isSmuMode: false }));
            await dispatch(setDeviceRunning(true));
        }
    };
}

export const updateTriggerLevel =
    (triggerLevel: number) => (dispatch: TDispatch) =>
        dispatch(triggerLevelSetAction(triggerLevel));
