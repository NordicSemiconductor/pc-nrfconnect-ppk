/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { remote } from 'electron';

export const bufferLengthInSeconds = 60 * 5;

const samplingTime = 10;
const samplesPerSecond = 1e6 / samplingTime;

export const options = {
    samplingTime,
    samplesPerSecond,
    data: new Float32Array(samplesPerSecond * bufferLengthInSeconds),
    bits: null,
    index: 0,
    timestamp: null,
};

export const nbDigitalChannels = 8;

export const timestampToIndex = (ts, index = options.index) =>
    index - ((options.timestamp - ts) * options.samplesPerSecond) / 1e6;

export const indexToTimestamp = (i, index = options.index) =>
    options.timestamp - ((index - i) * 1e6) / options.samplesPerSecond;

export const updateTitle = info => {
    const title = remote.getCurrentWindow().getTitle().split(':')[0].trim();
    remote
        .getCurrentWindow()
        .setTitle(`${title}${info ? ':' : ''} ${info || ''}`);
};
