/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow } from '@electron/remote';
import {
    AppThunk,
    logger,
    setCurrentPane,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import describeError from '@nordicsemiconductor/pc-nrfconnect-shared/src/logging/describeError';
import fs from 'fs';
import { dirname, join } from 'path';

import { resetCache } from '../components/Chart/data/dataAccumulator';
import {
    miniMapAnimationAction,
    resetMinimap,
    triggerForceRerender as triggerForceRerenderMiniMap,
} from '../features/minimap/minimapSlice';
import {
    closeProgressDialog,
    setErrorMessage,
    showProgressDialog,
    updateProgress,
} from '../features/ProgressDialog/progressSlice';
import {
    ChangeSessionStatus,
    SessionFlag,
} from '../features/recovery/SessionsListFileHandler';
import { DataManager } from '../globals';
import type { RootState } from '../slices';
import {
    getDiskFullTrigger,
    getSessionRootFolder,
    setFileLoadedAction,
    setSavePending,
} from '../slices/appSlice';
import {
    chartWindowAction,
    getWindowDuration,
    resetChartTime,
    resetCursor,
    scrollToEnd,
    setLatestDataTimestamp,
    setLiveMode,
    triggerForceRerender as triggerForceRerenderMainChart,
} from '../slices/chartSlice';
import { updateSampleFreqLog10 } from '../slices/dataLoggerSlice';
import loadData from '../utils/loadFileHandler';
import { Panes } from '../utils/panes';
import { getLastSaveDir, setLastSaveDir } from '../utils/persistentStore';
import saveData, { PPK2Metadata } from '../utils/saveFileHandler';

const getTimestamp = () =>
    new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);

export const save =
    (): AppThunk<RootState, Promise<void>> => async dispatch => {
        const activeSessionFolder = DataManager().getSessionFolder();
        if (!activeSessionFolder) return;

        const saveFileName = `ppk2-${getTimestamp()}`;
        let { filePath: filename } = await dialog.showSaveDialog(
            getCurrentWindow(),
            {
                defaultPath: join(getLastSaveDir(), saveFileName),
                filters: [
                    {
                        name: 'Power profiler kit',
                        extensions: ['ppk2'],
                    },
                ],
            }
        );
        if (!filename) {
            return;
        }
        setLastSaveDir(dirname(filename));

        const dataToBeSaved: PPK2Metadata = {
            metadata: {
                samplesPerSecond: DataManager().getSamplesPerSecond(),
                startSystemTime: DataManager().getStartSystemTime(),
            },
        };

        if (!filename.toLocaleLowerCase().endsWith('.ppk2')) {
            filename = `${filename}.ppk2`;
        }

        try {
            dispatch(
                showProgressDialog({
                    title: 'Exporting',
                    message: 'Exporting PPK File',
                })
            );
            const session = DataManager().getSessionBuffers();

            await saveData(
                filename,
                dataToBeSaved,
                session.fileBuffer,
                session.foldingBuffer,
                message => {
                    dispatch(updateProgress({ indeterminate: true, message }));
                }
            );

            const sessionPath = DataManager().getSessionFolder();
            if (sessionPath) {
                const filePath = join(sessionPath, 'session.raw');
                ChangeSessionStatus(filePath, SessionFlag.Recovered);
            }

            dispatch(setSavePending(false));
            dispatch(closeProgressDialog());

            logger.info(`State saved to: ${filename}`);
        } catch (error) {
            dispatch(setErrorMessage(describeError(error)));
            logger.error(`Error exporting file: ${describeError(error)}`);
        }
    };

export const load =
    (
        setLoading: (value: boolean) => void
    ): AppThunk<RootState, Promise<void>> =>
    async (dispatch, getState) => {
        const {
            filePaths: [filename],
        } =
            (await dialog.showOpenDialog(getCurrentWindow(), {
                defaultPath: getLastSaveDir(),
                filters: [
                    {
                        name: 'Power profiler kit',
                        extensions: ['ppk', 'ppk2'],
                    },
                ],
            })) || [];
        if (!filename) {
            return;
        }

        setLoading(true);
        dispatch(setSavePending(false));
        logger.info(`Restoring state from ${filename}`);
        resetCache();
        await DataManager().reset();
        dispatch(resetChartTime());
        dispatch(resetMinimap());
        dispatch(setLiveMode(false));
        dispatch(resetCursor());

        dispatch(
            showProgressDialog({
                title: 'Importing',
                message: 'Loading PPK File',
            })
        );
        try {
            const timestamp = await loadData(
                filename,
                getSessionRootFolder(getState()),
                getDiskFullTrigger(getState()),
                (message, progress, indeterminate) => {
                    dispatch(
                        updateProgress({ message, progress, indeterminate })
                    );
                }
            );

            dispatch(setCurrentPane(Panes.DATA_LOGGER));
            dispatch(closeProgressDialog());

            if (timestamp) {
                dispatch(setLatestDataTimestamp(timestamp));
                dispatch(
                    updateSampleFreqLog10({
                        sampleFreqLog10: Math.log10(
                            DataManager().getSamplesPerSecond()
                        ),
                    })
                );
                if (
                    DataManager().getTimestamp() <=
                    getWindowDuration(getState())
                ) {
                    dispatch(
                        chartWindowAction(0, DataManager().getTimestamp())
                    );
                } else {
                    dispatch(scrollToEnd());
                }
                dispatch(triggerForceRerenderMainChart());
                dispatch(triggerForceRerenderMiniMap());
                dispatch(miniMapAnimationAction());
            }

            dispatch(setFileLoadedAction(filename));
        } catch (error) {
            dispatch(setErrorMessage(describeError(error)));
        }

        setLoading(false);
    };

export const screenshot = () => async () => {
    const win = getCurrentWindow();
    const mainElement = document.querySelector('.core19-main-container');

    if (!mainElement) {
        logger.error('screenshot: Could not get dimensions of Client Window');
        return;
    }

    const { x, y, width, height } = mainElement.getBoundingClientRect();
    const image = await win.capturePage({
        x,
        y,
        width,
        height,
    });

    const timestamp = getTimestamp();
    const filters = [
        { name: 'PNG', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] },
    ];

    const { filePath: filename } = await dialog.showSaveDialog(
        getCurrentWindow(),
        {
            defaultPath: join(getLastSaveDir(), `ppk-${timestamp}.png`),
            filters,
        }
    );
    if (!filename) {
        return;
    }

    setLastSaveDir(dirname(filename));

    fs.writeFileSync(filename, image.toPNG());
};
