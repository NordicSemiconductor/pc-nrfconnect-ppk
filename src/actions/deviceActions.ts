/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO: Remove, only added for conservative refactoring to typescript */

import {
    AppThunk,
    Device,
    logger,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import describeError from '@nordicsemiconductor/pc-nrfconnect-shared/src/logging/describeError';
import { unit } from 'mathjs';
import path from 'path';

import { resetCache } from '../components/Chart/data/dataAccumulator';
import SerialDevice from '../device/serialDevice';
import { SampleValues } from '../device/types';
import {
    miniMapAnimationAction,
    resetMinimap,
    triggerForceRerender as triggerForceRerenderMiniMap,
} from '../features/minimap/minimapSlice';
import { startPreventSleep, stopPreventSleep } from '../features/preventSleep';
import {
    DataManager,
    frameSize,
    indexToTimestamp,
    microSecondsPerSecond,
    updateTitle,
} from '../globals';
import { RootState } from '../slices';
import {
    deviceClosedAction,
    deviceOpenedAction,
    getDiskFullTrigger,
    getSessionRootFolder,
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
    setLatestDataTimestamp,
    triggerForceRerender as triggerForceRerenderMainChart,
} from '../slices/chartSlice';
import { setSamplingAttrsAction } from '../slices/dataLoggerSlice';
import { updateGainsAction } from '../slices/gainsSlice';
import {
    clearProgress,
    deregisterSaveEvent,
    getAutoExportTrigger,
    registerSaveEvent,
    resetTriggerOrigin,
    setAutoExportTrigger,
    setProgress,
    setTriggerActive,
    setTriggerOrigin,
} from '../slices/triggerSlice';
import { updateRegulator as updateRegulatorAction } from '../slices/voltageRegulatorSlice';
import EventAction from '../usageDataActions';
import { convertBits16 } from '../utils/bitConversion';
import { convertTimeToSeconds } from '../utils/duration';
import { isDiskFull } from '../utils/fileUtils';
import { isDataLoggerPane, isRealTimePane } from '../utils/panes';
import { setSpikeFilter as persistSpikeFilter } from '../utils/persistentStore';
import saveData, { PPK2Metadata } from '../utils/saveFileHandler';

let device: null | SerialDevice = null;
let updateRequestInterval: NodeJS.Timeout | undefined;

export const setupOptions =
    (): AppThunk<RootState, Promise<void>> => async (dispatch, getState) => {
        if (!device) return;
        try {
            await DataManager().reset();
            dispatch(resetChartTime());
            dispatch(resetMinimap());

            const { sampleFreq } = getState().app.dataLogger;
            DataManager().setSamplesPerSecond(sampleFreq);
            if (isDataLoggerPane(getState())) {
                DataManager().initializeLiveSession(
                    getSessionRootFolder(getState())
                );
            } else {
                DataManager().initializeTriggerSession(60);
            }
        } catch (err) {
            logger.error(err);
        }
        dispatch(chartWindowUnLockAction());
        dispatch(animationAction());
    };

// Only used by Data Logger Pane
/* Start reading current measurements */
export const samplingStart =
    (): AppThunk<RootState, Promise<void>> => async dispatch => {
        telemetry.sendEvent(EventAction.SAMPLE_STARTED_WITH_PPK2_SELECTED);

        dispatch(setTriggerActive(false));
        dispatch(resetTriggerOrigin());
        // Prepare global options
        await dispatch(setupOptions());

        dispatch(resetCursorAndChart());
        dispatch(samplingStartAction());
        await device!.ppkAverageStart();
        startPreventSleep();
    };

export const samplingStop =
    (): AppThunk<RootState, Promise<void>> => async dispatch => {
        if (!device) return;
        dispatch(samplingStoppedAction());
        await device.ppkAverageStop();
        stopPreventSleep();
    };

export function triggerStop() {
    return async () => {
        if (!device) return;
        logger.info('Stopping trigger');
        await device.ppkTriggerStop();
        stopPreventSleep();
    };
}

export const updateSpikeFilter = (): AppThunk<RootState> => (_, getState) => {
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

export const close =
    (): AppThunk<RootState, Promise<void>> => async (dispatch, getState) => {
        clearInterval(updateRequestInterval);
        if (!device) {
            return;
        }
        if (getState().app.app.samplingRunning) {
            await dispatch(samplingStop());
        }

        await device.stop();
        device.removeAllListeners();
        device = null;
        dispatch(deviceClosedAction());
        logger.info('PPK closed');
        updateTitle();
    };

const initGains = (): AppThunk<RootState, Promise<void>> => async dispatch => {
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
    (deviceInfo: Device): AppThunk<RootState, Promise<void>> =>
    async (dispatch, getState) => {
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
        let lastDiskFullCheck = 0;

        const onSample = ({ value, bits }: SampleValues) => {
            const {
                app: { samplingRunning },
                dataLogger: { maxSampleFreq, sampleFreq },
            } = getState().app;
            if (!samplingRunning) {
                return;
            }

            let cappedValue = value ?? 0.2;
            // PPK 2 can only read till 200nA (0.2uA)
            if (cappedValue < 0.2) {
                cappedValue = 0;
            }

            const b16 = convertBits16(bits!);

            if (samplingRunning && sampleFreq < maxSampleFreq) {
                const samplesPerAverage = maxSampleFreq / sampleFreq;
                nbSamples += 1;
                nbSamplesTotal += 1;
                const f = Math.min(nbSamplesTotal, samplesPerAverage);
                if (Number.isFinite(value) && Number.isFinite(prevValue)) {
                    cappedValue = prevValue + (cappedValue - prevValue) / f;
                }
                if (nbSamples < samplesPerAverage) {
                    if (value !== undefined) {
                        prevValue = cappedValue;
                        prevBits |= b16;
                    }
                    return;
                }
                nbSamples = 0;
            }

            DataManager().addData(cappedValue, b16 | prevBits);
            prevBits = 0;

            if (isRealTimePane(getState())) {
                const validTriggerValue =
                    cappedValue >= getState().app.trigger.level;
                if (!getState().app.trigger.active && validTriggerValue) {
                    dispatch(setTriggerActive(true));
                    dispatch(
                        processTrigger(cappedValue, (progressMessage, prog) => {
                            dispatch(
                                setProgress({
                                    progressMessage,
                                    progress:
                                        prog && prog >= 0 ? prog : undefined,
                                })
                            );
                        })
                    ).then(() => {
                        if (!DataManager().hasPendingTriggers()) {
                            dispatch(clearProgress());
                        }
                        if (
                            samplingRunning &&
                            getState().app.trigger.type === 'Single'
                        ) {
                            dispatch(samplingStop());
                        }
                    });
                } else if (
                    getState().app.trigger.active &&
                    !validTriggerValue &&
                    getState().app.trigger.type === 'Continuous'
                ) {
                    dispatch(setTriggerActive(false));
                }
            }

            const durationInMicroSeconds =
                convertTimeToSeconds(
                    getState().app.dataLogger.duration,
                    getState().app.dataLogger.durationUnit
                ) * microSecondsPerSecond;
            if (durationInMicroSeconds <= DataManager().getTimestamp()) {
                if (samplingRunning) {
                    dispatch(samplingStop());
                }

                const shouldCheckDiskFull =
                    performance.now() - lastDiskFullCheck > 10_000;

                if (shouldCheckDiskFull) {
                    lastDiskFullCheck = performance.now();
                    isDiskFull(
                        getDiskFullTrigger(getState()),
                        getSessionRootFolder(getState())
                    ).then(isFull => {
                        if (isFull) {
                            logger.warn(
                                'Session stopped. Disk full trigger detected'
                            );
                            dispatch(samplingStop());
                        }
                    });
                }
            }
        };

        try {
            device = new SerialDevice(deviceInfo, onSample);
            telemetry.sendEvent(EventAction.PPK_2_SELECTED);

            dispatch(
                setSamplingAttrsAction({
                    maxContiniousSamplingTimeUs:
                        device.capabilities.maxContinuousSamplingTimeUs!,
                })
            );

            dispatch(
                setDeviceRunningAction({
                    isRunning: device.isRunningInitially,
                })
            );
            const metadata = device.parseMeta(await device.start());

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

            dispatch(setFileLoadedAction(false));

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
                getState().app.app.samplingRunning &&
                isDataLoggerPane(getState())
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

export const updateRegulator =
    (): AppThunk<RootState, Promise<void>> => async (dispatch, getState) => {
        const { vdd } = getState().app.voltageRegulator;
        await device!.ppkUpdateRegulator(vdd);
        logger.info(`Voltage regulator updated to ${vdd} mV`);
        dispatch(updateRegulatorAction({ currentVDD: vdd }));
    };

export const updateGains =
    (index: number): AppThunk<RootState, Promise<void>> =>
    async (_, getState) => {
        if (device!.ppkSetUserGains == null) {
            return;
        }
        const { gains } = getState().app;
        const gain = gains[index] / 100;
        await device!.ppkSetUserGains(index, gain);
        logger.info(`Gain multiplier #${index + 1} updated to ${gain}`);
    };

export const setDeviceRunning =
    (isRunning: boolean): AppThunk<RootState, Promise<void>> =>
    async dispatch => {
        await device!.ppkDeviceRunning(isRunning ? 1 : 0);
        logger.info(`DUT ${isRunning ? 'ON' : 'OFF'}`);
        dispatch(setDeviceRunningAction({ isRunning }));
    };

export const setPowerMode =
    (isSmuMode: boolean): AppThunk<RootState, Promise<void>> =>
    async dispatch => {
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

let latestTrigger: Promise<unknown> | undefined;
let releaseLastSession: (() => void) | undefined;

export const processTrigger =
    (
        triggerValue: number,
        onProgress?: (message: string, progress?: number) => void
    ): AppThunk<RootState, Promise<void>> =>
    async (dispatch, getState) => {
        if (!DataManager().isInSync()) {
            logger.debug('skipping trigger out of sync');
            return;
        }

        if (latestTrigger !== undefined) {
            logger.debug('Still recording active trigger');
            return;
        }

        const trigger = DataManager().addTimeReachedTrigger(
            getState().app.trigger.recordingLength * 1000 // ms to uS
        );

        const triggerTime = Date.now();
        const remainingRecordingLength =
            getState().app.trigger.recordingLength / 2;

        const updateDataCollection = () => {
            const delta = Date.now() - triggerTime;
            onProgress?.(
                `Triggered with ${unit(triggerValue, 'uA').format({
                    notation: 'fixed',
                    precision: 2,
                })}. Collecting data after trigger.`,
                Math.min(100, (delta / remainingRecordingLength) * 100)
            );
        };

        latestTrigger = trigger;
        const timeProgressUpdate = setInterval(() => {
            updateDataCollection();
        }, 500);

        trigger.finally(() => {
            clearInterval(timeProgressUpdate);
        });

        try {
            const info = await trigger;

            const numberOfBytes =
                info.bytesRange.end - info.bytesRange.start + 1;
            const buffer = Buffer.alloc(numberOfBytes);
            info.writeBuffer.readFromCachedData(
                buffer,
                info.bytesRange.start,
                info.bytesRange.end - info.bytesRange.start
            );

            const recordingDuration = indexToTimestamp(
                numberOfBytes / frameSize
            );
            const savePath = getState().app.trigger.savePath;
            const shouldSave = getState().app.trigger.autoExportTrigger;

            const createSessionData = DataManager().createSessionData;
            let session:
                | Awaited<ReturnType<typeof createSessionData>>
                | undefined;
            let savePromise: Promise<void> | undefined;

            if (shouldSave && savePath) {
                // createSession
                session = await createSessionData(
                    buffer,
                    getSessionRootFolder(getState()),
                    info.absoluteTime
                );

                const dataToBeSaved: PPK2Metadata = {
                    metadata: {
                        samplesPerSecond: DataManager().getSamplesPerSecond(),
                        startSystemTime: info.absoluteTime,
                    },
                };

                dispatch(registerSaveEvent());
                savePromise = saveData(
                    path.join(
                        savePath,
                        `${info.absoluteTime + info.timeRange.start} - ${
                            info.absoluteTime + info.timeRange.end
                        }.ppk2`
                    ),
                    dataToBeSaved,
                    session.fileBuffer,
                    session.foldingBuffer
                )
                    .then(async () => {
                        if (
                            (await isDiskFull(
                                getDiskFullTrigger(getState()),
                                getSessionRootFolder(getState())
                            )) &&
                            getAutoExportTrigger(getState())
                        ) {
                            telemetry.sendEvent('Auto Export', {
                                state: false,
                                reason: 'Disk Full',
                            });
                            logger.warn(
                                'Auto export was turned off due disk being full'
                            );
                            dispatch(setAutoExportTrigger(false));
                        }
                    })
                    .finally(() => {
                        dispatch(deregisterSaveEvent());
                    });
            }

            // createSession
            if (!session)
                session = await createSessionData(
                    buffer,
                    getSessionRootFolder(getState()),
                    info.absoluteTime
                );

            dispatch(setTriggerOrigin(indexToTimestamp(info.triggerOrigin)));

            resetCache();
            latestTrigger = undefined;
            // Auto load triggered data
            await DataManager().loadSession(
                session.fileBuffer,
                session.foldingBuffer
            );
            dispatch(setLatestDataTimestamp(recordingDuration));
            dispatch(chartWindowAction(recordingDuration, recordingDuration));
            dispatch(triggerForceRerenderMainChart());
            dispatch(triggerForceRerenderMiniMap());
            dispatch(miniMapAnimationAction());

            if (session) {
                releaseLastSession?.();
                releaseLastSession = undefined;
                releaseLastSession = async () => {
                    try {
                        await savePromise;
                    } catch {
                        // do nothing
                    }

                    try {
                        await session?.fileBuffer.close();
                        session?.fileBuffer.release();
                    } catch {
                        // do nothing
                    }
                };
            }
        } catch (e) {
            logger.debug(describeError(e));
        }
    };
