/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow } from '@electron/remote';
import {
    currentPane as currentPaneSelector,
    logger,
    setCurrentPane,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import fs from 'fs';
import { dirname, join } from 'path';

import { minimapEvents } from '../features/minimap/minimapEvents';
import { DataManager, updateTitle } from '../globals';
import type { RootState } from '../slices';
import { setFileLoadedAction } from '../slices/appSlice';
import { setChartState } from '../slices/chartSlice';
import { setDataLoggerState } from '../slices/dataLoggerSlice';
import { TDispatch } from '../slices/thunk';
import { setTriggerState } from '../slices/triggerSlice';
import loadData from '../utils/loadFileHandler';
import { paneName } from '../utils/panes';
import { getLastSaveDir, setLastSaveDir } from '../utils/persistentStore';
import saveData, { SaveData } from '../utils/saveFileHandler';

const getTimestamp = () =>
    new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);

export const save = () => async (_: TDispatch, getState: () => RootState) => {
    const saveFileName = `ppk-${getTimestamp()}-${paneName(getState())}.ppk`;
    const { filePath: filename } = await dialog.showSaveDialog({
        defaultPath: join(getLastSaveDir(), saveFileName),
    });
    if (!filename) {
        return;
    }
    setLastSaveDir(dirname(filename));

    const data = DataManager().getData();
    const metadata = DataManager().getMetadata();

    const dataToBeSaved: SaveData = {
        data: data.current,
        bits: data.bits,
        metadata: {
            options: {
                ...metadata,
                currentPane: currentPaneSelector(getState()),
            },
            chartState: getState().app.chart,
            triggerState: getState().app.trigger,
            dataLoggerState: getState().app.dataLogger,
        },
    };

    const saved = await saveData(filename, dataToBeSaved);
    if (saved) {
        logger.info(`State saved to: ${filename}`);
    }
};

export const load =
    (setLoading: (value: boolean) => void) => async (dispatch: TDispatch) => {
        const {
            filePaths: [filename],
        } =
            (await dialog.showOpenDialog({
                defaultPath: getLastSaveDir(),
            })) || [];
        if (!filename) {
            return;
        }

        setLoading(true);
        logger.info(`Restoring state from ${filename}`);
        updateTitle(filename);
        const result = await loadData(filename);
        if (!result) {
            logger.error(`Error loading from ${filename}`);
            setLoading(false);
            return;
        }
        const { dataBuffer, bits, metadata } = result;

        const {
            chartState,
            triggerState,
            dataLoggerState,
            options: { currentPane, samplingTime, samplesPerSecond, timestamp },
        } = metadata;

        DataManager().setSamplingTime(samplingTime);
        DataManager().setSamplesPerSecond(samplesPerSecond);
        DataManager().loadData(dataBuffer, bits, timestamp);

        dispatch(setChartState(chartState));
        dispatch(setFileLoadedAction({ loaded: true }));
        if (dataLoggerState !== null) {
            dispatch(setDataLoggerState({ state: dataLoggerState }));
        }
        if (triggerState !== null) {
            dispatch(setTriggerState(triggerState));
        }
        if (currentPane !== null) dispatch(setCurrentPane(currentPane));
        logger.info(`State successfully restored`);
        setLoading(false);

        minimapEvents.clear();
        minimapEvents.update();
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

    const { filePath: filename } = await dialog.showSaveDialog({
        defaultPath: join(getLastSaveDir(), `ppk-${timestamp}.png`),
        filters,
    });
    if (!filename) {
        return;
    }

    setLastSaveDir(dirname(filename));

    fs.writeFileSync(filename, image.toPNG());
};
