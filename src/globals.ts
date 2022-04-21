/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { remote } from 'electron';

export const bufferLengthInSeconds = 60 * 5;
export const numberOfDigitalChannels = 8;

const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;

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
    samplingTime: initialSamplingTime,
    samplesPerSecond: initialSamplesPerSecond,
    data: new Float32Array(initialSamplesPerSecond * bufferLengthInSeconds),
    bits: null,
    index: 0,
    timestamp: null,
};

/**
 * Get the sampling time derived from samplesPerSecond
 * @param {number} samplesPerSecond number of samples per second
 * @returns {number} samplingTime which is the time in microseconds between samples
 */
export const getSamplingTime = (samplesPerSecond: number): number => {
    const microSecondsPerSecond = 1e6;
    return microSecondsPerSecond / samplesPerSecond;
};

/**
 * Set the new global samplesPerSecond and samplingTime frequency.
 * @param {number} samplesPerSecond the new samplesPerSecond
 * @returns {void} derives samplingTime from samplesPerSecond
 */
export const setSamplingRates = (samplesPerSecond: number): void => {
    options.samplesPerSecond = samplesPerSecond;
    options.samplingTime = getSamplingTime(samplesPerSecond);
};

/**
 * Initiates new sample array if new buffer size is not equal to the present one.
 * @param {number} samplingDuration maximum number of seconds with sampling
 * @returns {void} derives buffer size and initiates new buffer for data samples if the current length of the buffer is not equal to the new buffer size.
 * Also fills the buffer with NaN to make sure the buffer is cleared.
 */
export const initializeDataBuffer = (samplingDuration: number) => {
    const newBufferSize = Math.trunc(
        samplingDuration * options.samplesPerSecond
    );
    if (options.data.length !== newBufferSize) {
        options.data = new Float32Array(newBufferSize);
    }
    options.data.fill(NaN);
};

/**
 *
 * @param {number} samplingDuration maximum number of seconds with sampling
 * @returns {void} derives buffer size and initiates new buffer for bits if there is no buffer from before or if the current length of buffer
 * is not equal to the new buffer size. Fills the buffer with zeroes to make sure it is empty.
 */
export const initializeBitsBuffer = (samplingDuration: number) => {
    const newBufferSize = Math.trunc(
        samplingDuration * options.samplesPerSecond
    );
    if (!options.bits || options.bits.length !== newBufferSize) {
        options.bits = new Uint16Array(newBufferSize);
    }
    options.bits.fill(0);
};

/**
 * @returns {void} Removes the bits buffer by settings its value to null in the global options object
 */
export const removeBitsBuffer = () => {
    options.bits = null;
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
