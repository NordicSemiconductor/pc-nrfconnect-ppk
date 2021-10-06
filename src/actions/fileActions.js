/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { remote } from 'electron';
import fs from 'fs';
import { dirname, join } from 'path';
import {
    currentPane as currentPaneSelector,
    logger,
    setCurrentPane,
} from 'pc-nrfconnect-shared';

import { options, updateTitle } from '../globals';
import { setFileLoadedAction } from '../reducers/appReducer';
import { setChartState } from '../reducers/chartReducer';
import { setDataLoggerState } from '../reducers/dataLoggerReducer';
import { setTriggerState } from '../reducers/triggerReducer';
import loadData from '../utils/loadFileHandler';
import { paneName } from '../utils/panes';
import { lastSaveDir, setLastSaveDir } from '../utils/persistentStore';
import saveData from '../utils/saveFileHandler';

const { dialog } = remote;

const getTimestamp = () =>
    new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);

export const save = () => async (_, getState) => {
    const saveFileName = `ppk-${getTimestamp()}-${paneName(getState())}.ppk`;
    const { filePath: filename } = await dialog.showSaveDialog({
        defaultPath: join(lastSaveDir(), saveFileName),
    });
    if (!filename) {
        return;
    }
    setLastSaveDir(dirname(filename));

    const { data, bits, ...opts } = options;
    const dataToBeSaved = {
        data,
        bits,
        metadata: {
            options: { ...opts, currentPane: currentPaneSelector(getState()) },
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

export const load = () => async dispatch => {
    const {
        filePaths: [filename],
    } =
        (await dialog.showOpenDialog({
            defaultPath: lastSaveDir(),
        })) || [];
    if (!filename) {
        return;
    }

    updateTitle(filename);
    const result = await loadData(filename);
    if (!result) {
        logger.error(`Error loading from ${filename}`);
        return;
    }
    const { dataBuffer, bits, metadata } = result;

    const {
        chartState,
        triggerState,
        dataLoggerState,
        options: { currentPane, ...loadedOptions },
    } = metadata;

    Object.assign(options, loadedOptions);
    options.data = dataBuffer;
    options.bits = bits;

    dispatch(setChartState(chartState));
    dispatch(setFileLoadedAction(true));
    if (dataLoggerState !== null) {
        dispatch(setDataLoggerState(dataLoggerState));
    }
    if (triggerState !== null) {
        dispatch(setTriggerState(triggerState));
    }
    if (currentPane !== null) dispatch(setCurrentPane(currentPane));
    logger.info(`State restored from: ${filename}`);
};

export const screenshot = () => async () => {
    const win = remote.getCurrentWindow();
    const mainElement = document.querySelector('.core19-main-container');
    const { x, y, width, height } = mainElement.getBoundingClientRect();
    const chartTop = mainElement.querySelector('.chart-top');
    const { marginTop, height: h } = getComputedStyle(chartTop);
    const chopOff = parseInt(marginTop, 10) + parseInt(h, 10);
    const image = await win.capturePage({
        x,
        y: y + chopOff,
        width,
        height: height - chopOff,
    });

    const timestamp = getTimestamp();
    const filters = [
        { name: 'PNG', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] },
    ];

    const { filePath: filename } = await dialog.showSaveDialog({
        defaultPath: join(lastSaveDir(), `ppk-${timestamp}.png`),
        filters,
    });
    if (!filename) {
        return;
    }

    setLastSaveDir(dirname(filename));

    fs.writeFileSync(filename, image.toPNG());
};
