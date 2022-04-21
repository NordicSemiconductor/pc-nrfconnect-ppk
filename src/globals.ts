/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { remote } from 'electron';

import { TimestampType } from './components/Chart/data/dataTypes';

export const bufferLengthInSeconds = 60 * 5;
export const numberOfDigitalChannels = 8;

const samplingTime = 10;
const samplesPerSecond = 1e6 / samplingTime;

interface GlobalOptions {
    /** Time between each sample denoted in microseconds, which is equal to 1e-6 seconds \
     *  e.g. if samplesPerSecond is 100_000, then a sample is taken every 10th microsecond
     */
    samplingTime: number;
    /** The number of samples per second */
    samplesPerSecond: number;
    /** @var data: contains all samples of current denoted in uA (microAmpere). */
    data: Float32Array;
    /** @var [bits]: contains the bit state for each sample, variable may be null */
    bits: Uint16Array | null;
    /** @var index: pointer to the index of the last sample in data array */
    index: number;
    /** Timestamp for the latest sample taken, incremented by {samplingTime} for each sample */
    timestamp: number | undefined | null;
}

export const options: GlobalOptions = {
    samplingTime,
    samplesPerSecond,
    data: new Float32Array(samplesPerSecond * bufferLengthInSeconds),
    bits: null,
    index: 0,
    timestamp: null,
};

export const setSamplingRate = (samplingFrequencyPerSecond: number): void => {
    const microSecondsPerSecond = 1e6;
    options.samplesPerSecond = samplingFrequencyPerSecond;
    options.samplingTime = microSecondsPerSecond / samplingFrequencyPerSecond;
};

/**
 * Translate timestamp to index of sample array
 * @param {number} timestamp timestamp to translate to index
 * @returns {Number} index of sample at provided timestamp
 */
export const timestampToIndex = (timestamp: number): number => {
    const lastTimestamp = options?.timestamp ? options.timestamp : 0;
    const microSecondsPerSecond = 1e6;
    return (
        options.index -
        ((lastTimestamp - timestamp) * options.samplesPerSecond) /
            microSecondsPerSecond
    );
};

/**
 * Translate index of sample array to timestamp
 * @param {Number} index index to translate to timestamp
 * @returns {TimestampType} timestamp of sample at provided index
 * ## Conversion Details
 * lastTimestamp should be the timestamp at the time of options.index \
 * To get the timestamp at some index subtract the difference in time between globals.index and index from the lastTimestamp.
 */
export const indexToTimestamp = (index: number): number => {
    const lastTimestamp = options?.timestamp ? options.timestamp : 0;
    const microSecondsPerSecond = 1e6;
    return (
        lastTimestamp -
        ((options.index - index) * microSecondsPerSecond) /
            options.samplesPerSecond
    );
};

export const updateTitle = (info: string | undefined) => {
    const title = remote.getCurrentWindow().getTitle().split(':')[0].trim();
    remote
        .getCurrentWindow()
        .setTitle(`${title}${info ? ':' : ''} ${info || ''}`);
};
