/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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

import fs from 'fs';
import { remote } from 'electron';
import { join, dirname } from 'path';
import { logger } from 'nrfconnect/core';
import {
    setCurrentPane,
    currentPane as currentPaneSelector,
} from '../from_pc-nrfconnect-shared';
import { options, updateTitle } from '../globals';
import { setChartState } from '../reducers/chartReducer';
import { setTriggerState } from '../reducers/triggerReducer';
import { setFileLoadedAction } from '../reducers/appReducer';
import saveData from '../utils/saveFileHandler';
import loadData from '../utils/loadFileHandler';
import { paneName } from '../utils/panes';

import { lastSaveDir, setLastSaveDir } from '../utils/persistentStore';

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
        options: { currentPane, ...loadedOptions },
    } = metadata;

    Object.assign(options, loadedOptions);
    options.data = dataBuffer;
    options.bits = bits;

    dispatch(setChartState(chartState));
    dispatch(setFileLoadedAction(true));
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
