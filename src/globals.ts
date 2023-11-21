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

let cachedBegin: number | undefined;
let cashedDataCurrent: Float32Array | undefined;
let cashedBits: Uint16Array | undefined;

const loadNeededDataCurrent = (
    begin: number,
    end: number,
    getData: (fromTime: number, toTime: number) => Float32Array,
    cashedData?: Float32Array
): Float32Array => {
    if (!cashedData || cachedBegin === undefined) return getData(begin, end);

    const lastEnd = cachedBegin + indexToTimestamp(cashedData.length);

    let usableCachedData: Float32Array = cashedData;

    const beginDelta =
        timestampToIndex(begin) - timestampToIndex(cachedBegin ?? 0);
    if (beginDelta > 0) {
        usableCachedData = usableCachedData.slice(beginDelta);
    }

    const endDelta = timestampToIndex(lastEnd ?? 0) - timestampToIndex(end);
    if (lastEnd && endDelta > 0) {
        usableCachedData = usableCachedData.slice(
            0,
            usableCachedData.length - endDelta
        );
    }

    let frontData: Float32Array = new Float32Array(0);
    if (cachedBegin > begin) {
        frontData = getData(begin, cachedBegin);
    }

    let backData: Float32Array = new Float32Array(0);
    if (end > lastEnd) {
        backData = getData(lastEnd, end);
    }

    const result = new Float32Array(
        frontData.length + usableCachedData.length + backData.length
    );

    result.set(frontData);
    result.set(usableCachedData, frontData.length);
    result.set(backData, frontData.length + usableCachedData.length);

    return result;
};

const loadNeededDataBits = (
    begin: number,
    end: number,
    getData: (fromTime: number, toTime: number) => Uint16Array | null,
    cashedData?: Uint16Array
): Uint16Array | null => {
    if (!cashedData || cachedBegin === undefined) return getData(begin, end);

    const lastEnd = cachedBegin + indexToTimestamp(cashedData.length);

    let usableCachedData: Uint16Array = cashedData;

    const beginDelta =
        timestampToIndex(begin) - timestampToIndex(cachedBegin ?? 0);
    if (beginDelta > 0) {
        usableCachedData = usableCachedData.slice(beginDelta);
    }

    const endDelta = timestampToIndex(lastEnd ?? 0) - timestampToIndex(end);
    if (lastEnd && endDelta > 0) {
        usableCachedData = usableCachedData.slice(
            0,
            usableCachedData.length - endDelta
        );
    }

    let frontData: Uint16Array | null = new Uint16Array(0);
    if (cachedBegin > begin) {
        frontData = getData(begin, cachedBegin);
    }

    let backData: Uint16Array | null = new Uint16Array(0);
    if (end > lastEnd) {
        backData = getData(lastEnd, end);
    }

    const result = new Uint16Array(
        (frontData?.length ?? 0) +
            usableCachedData.length +
            (backData?.length ?? 0)
    );

    if (frontData) result.set(frontData);
    result.set(usableCachedData, frontData?.length ?? 0);

    if (backData)
        result.set(
            backData,
            (frontData?.length ?? 0) + usableCachedData.length
        );

    return result;
};

const getDataCurrent = (fromTime: number, toTime: number) => {
    const result = loadNeededDataCurrent(
        fromTime,
        toTime,
        (begin: number, end: number) =>
            options.data.slice(timestampToIndex(begin), timestampToIndex(end)),
        cashedDataCurrent
    );
    if (DataManager().getTimestamp() < toTime) {
        cashedDataCurrent = result.slice(
            0,
            timestampToIndex(Math.min(DataManager().getTimestamp(), toTime)) -
                timestampToIndex(fromTime)
        );
    } else {
        cashedDataCurrent = result;
    }

    return result;
};

const getDataBits = (fromTime: number, toTime: number) => {
    if (!options.bits) {
        return null;
    }

    const result = loadNeededDataBits(
        fromTime,
        toTime,
        (begin: number, end: number) =>
            options.bits
                ? options.bits?.slice(
                      timestampToIndex(begin),
                      timestampToIndex(end)
                  )
                : null,
        cashedBits
    );

    if (DataManager().getTimestamp() < toTime) {
        cashedBits = result?.slice(
            0,
            timestampToIndex(Math.min(DataManager().getTimestamp(), toTime)) -
                timestampToIndex(fromTime)
        );
    } else {
        cashedBits = result ?? undefined;
    }

    return result;
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
    getData: (fromTime = 0, toTime = options.timestamp) => {
        const result = {
            current: getDataCurrent(fromTime, toTime),
            bits: getDataBits(fromTime, toTime),
        };

        cachedBegin = fromTime;

        return result;
    },

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
        cachedBegin = undefined;
        cashedBits = undefined;
        cashedDataCurrent = undefined;
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
    hasBits: () => !!options.bits,
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
