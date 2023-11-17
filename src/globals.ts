/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// FIXME: Will ned to remove the line under at some point.

import { getCurrentWindow } from '@electron/remote';

export const bufferLengthInSeconds = 60 * 5;
export const numberOfDigitalChannels = 8;

const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;
export const microSecondsPerSecond = 1e6;

export interface GlobalOptions {
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
    timestamp: number;
    currentPane?: number;
}
const options: GlobalOptions = {
    samplingTime: initialSamplingTime,
    samplesPerSecond: initialSamplesPerSecond,
    data: new Float32Array(initialSamplesPerSecond * bufferLengthInSeconds),
    bits: null,
    timestamp: 0,
};

export const DataManager = () => ({
    getSamplingTime: () => options.samplingTime,
    setSamplingTime: (samplingTime: number) => {
        options.samplingTime = samplingTime;
    },
    setSamplingRate: (rate: number) => {
        options.samplesPerSecond = rate;
        options.samplingTime = getSamplingTime(rate);
    },
    getSamplesPerSecond: () => options.samplesPerSecond,
    setSamplesPerSecond: (samplesPerSecond: number) => {
        options.samplesPerSecond = samplesPerSecond;
    },
    getData: (fromTime = 0, toTime = options.timestamp) =>
        options.data.slice(
            timestampToIndex(fromTime),
            timestampToIndex(toTime)
        ),
    getDataBits: (fromTime = 0, toTime = options.timestamp) =>
        options.bits
            ? options.bits.slice(
                  timestampToIndex(fromTime),
                  timestampToIndex(toTime)
              )
            : null,
    getTimestamp: () => options.timestamp - options.samplingTime,
    addData: (data: number, bitData: number) => {
        const index = timestampToIndex(options.timestamp);

        if (index < options.data.length) {
            options.data[index] = data;
        }

        if (options.bits) {
            options.bits[index] = bitData;
        }

        options.timestamp += options.samplingTime;

        return {
            dataAdded: index < options.data.length,
            bitDataAdded: !!options.bits,
        };
    },
    addBitData: (data: number) => {
        if (!options.bits) return;
        options.bits[timestampToIndex(options.timestamp)] = data;
        options.timestamp += options.samplingTime;
    },
    reset: () => {
        options.samplingTime = initialSamplingTime;
        options.samplesPerSecond = initialSamplesPerSecond;
        options.data = new Float32Array(
            initialSamplesPerSecond * bufferLengthInSeconds
        );
        options.bits = null;
        options.timestamp = 0;
    },
    initializeBitsBuffer: (samplingDuration: number) => {
        const newBufferSize = Math.trunc(
            samplingDuration * options.samplesPerSecond
        );
        if (!options.bits || options.bits.length !== newBufferSize) {
            options.bits = new Uint16Array(newBufferSize);
        }
        options.bits.fill(0);
    },
    initializeDataBuffer: (samplingDuration: number) => {
        const newBufferSize = Math.trunc(
            samplingDuration * options.samplesPerSecond
        );
        if (options.data.length !== newBufferSize) {
            options.data = new Float32Array(newBufferSize);
        }
        options.data.fill(NaN);
    },
    getDataBufferSize: () => options.data.length,
    getTotalSavedRecords: () => timestampToIndex(options.timestamp),
    isBufferFull: () =>
        timestampToIndex(options.timestamp) === options.data.length,
    getMetadata: () => ({
        samplesPerSecond: options.samplesPerSecond,
        samplingTime: options.samplingTime,
        timestamp: options.timestamp,
    }),
    loadData: (
        data: Float32Array,
        bits: Uint16Array | null,
        timestamp: number
    ) => {
        options.data = data;
        options.bits = bits;
        options.timestamp = timestamp;
    },
});

/**
 * Get the sampling time derived from samplesPerSecond
 * @param {number} samplingRate number of samples per second
 * @returns {number} samplingTime which is the time in microseconds between samples
 */
export const getSamplingTime = (samplingRate: number): number =>
    microSecondsPerSecond / samplingRate;

export const getSamplesPerSecond = () => options.samplesPerSecond;

export const removeBitsBuffer = (): void => {
    options.bits = null;
};

export const timestampToIndex = (timestamp: number): number =>
    Math.floor((timestamp / microSecondsPerSecond) * options.samplesPerSecond);

export const indexToTimestamp = (index: number): number =>
    microSecondsPerSecond * (index / options.samplesPerSecond);

export const getTotalDurationInMicroSeconds = () =>
    options.samplingTime * options.data.length;

export const updateTitle = (info?: string | null) => {
    const title = getCurrentWindow().getTitle().split(':')[0].trim();
    getCurrentWindow().setTitle(`${title}${info ? ':' : ''} ${info || ''}`);
};
