/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow } from '@electron/remote';
import { AppThunk, logger } from '@nordicsemiconductor/pc-nrfconnect-shared';
import describeError from '@nordicsemiconductor/pc-nrfconnect-shared/src/logging/describeError';
import fs from 'fs';
import { dirname, join } from 'path';

import {
    miniMapAnimationAction,
    resetMinimap,
} from '../features/minimap/minimapSlice';
import {
    closeProgressDialog,
    showProgressDialog,
    updateProgress,
} from '../features/ProgressDialog/progressSlice';
import { DataManager, updateTitle } from '../globals';
import type { RootState } from '../slices';
import { setFileLoadedAction } from '../slices/appSlice';
import {
    resetChartTime,
    scrollToEnd,
    setLatestDataTimestamp,
    setLiveMode,
    triggerForceRerender,
} from '../slices/chartSlice';
import loadData from '../utils/loadFileHandler';
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
                recordingDuration: DataManager().getTimestamp(),
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
            await saveData(
                filename,
                dataToBeSaved,
                activeSessionFolder,
                message => {
                    dispatch(updateProgress({ indeterminate: true, message }));
                }
            );
            dispatch(closeProgressDialog());

            logger.info(`State saved to: ${filename}`);
        } catch (error) {
            logger.error(`Error exporting file: ${describeError(error)}`);
        }
    };

export const load =
    (
        setLoading: (value: boolean) => void
    ): AppThunk<RootState, Promise<void>> =>
    async dispatch => {
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
        logger.info(`Restoring state from ${filename}`);
        DataManager().reset();
        dispatch(resetChartTime());
        dispatch(resetMinimap());
        dispatch(setLiveMode(false));
        updateTitle(filename);

        dispatch(
            showProgressDialog({
                title: 'Importing',
                message: 'Loading PPK File',
            })
        );
        const timestamp = await loadData(
            filename,
            (message, progress, indeterminate) => {
                dispatch(updateProgress({ message, progress, indeterminate }));
            }
        );

        dispatch(closeProgressDialog());

        if (timestamp) {
            dispatch(setLatestDataTimestamp(timestamp));
            dispatch(scrollToEnd());
            dispatch(triggerForceRerender());
            dispatch(miniMapAnimationAction());
        }

        dispatch(setFileLoadedAction(true));
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
