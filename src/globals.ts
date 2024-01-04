/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// FIXME: Will ned to remove the line under at some point.

import { getCurrentWindow } from '@electron/remote';
import usageData from '@nordicsemiconductor/pc-nrfconnect-shared/src/utils/usageData';
import fs from 'fs';

export const bufferLengthInSeconds = 60 * 5;
export const numberOfDigitalChannels = 8;

const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;
export const microSecondsPerSecond = 1e6;

export interface GlobalOptions {
    samplingDuration?: number;
    /** Time between each sample denoted in microseconds, which is equal to 1e-6 seconds \
     *  e.g. if samplesPerSecond is 100_000, then a sample is taken every 10th microsecond
     */
    samplingTime: number;
    /** The number of samples per second */
    samplesPerSecond: number;
    /** @var index: pointer to the index of the last sample in data array */
    timestamp?: number;
    fileHandel?: number;
}
const options: GlobalOptions = {
    samplingTime: initialSamplingTime,
    samplesPerSecond: initialSamplesPerSecond,
};

let cachedBegin: number | undefined;
let cashedData: Uint8Array | undefined;

class FileData {
    data: Uint8Array;
    constructor(data: Buffer) {
        this.data = data;
    }

    getAllCurrentData() {
        const numberOfElements = this.getLength();
        const result = new Float32Array(numberOfElements);
        for (let index = 0; index < numberOfElements; index += 1) {
            const byteOffset = index * (4 + 2);
            result.set(result.subarray(byteOffset, byteOffset + 4), index);
        }

        return result;
    }

    getCurrentData(index: number) {
        const byteOffset = index * (4 + 2);
        const result = Float32Array.from(
            this.data.subarray(byteOffset, byteOffset + 4)
        ).at(0);

        if (result === undefined) {
            throw new Error('Index out of range');
        }

        return result;
    }

    getAllBitData() {
        const numberOfElements = this.getLength();
        const result = new Uint16Array(numberOfElements);
        for (let index = 0; index < numberOfElements; index += 1) {
            const byteOffset = index * (4 + 2) + 4;
            result.set(result.subarray(byteOffset, byteOffset + 2), index);
        }

        return result;
    }

    getBitData(index: number) {
        const byteOffset = index * (4 + 2) + 4;
        const result = Uint16Array.from(
            this.data.subarray(byteOffset, byteOffset + 2)
        ).at(0);

        if (result === undefined) {
            throw new Error('Index out of range');
        }
        return result;
    }

    getLength() {
        return this.data.length / (4 + 2);
    }
}

const loadNeededData = (
    begin: number, // inclusive and normalized
    end: number, // inclusive and normalized
    getData: (fromTime: number, toTime: number) => Buffer,
    cashed?: Uint8Array
): Uint8Array => {
    return getData(begin, end);
    // if (!cashedData || cashedData.length === 0 || cachedBegin === undefined) {
    //     return getData(begin, end);
    // }

    // const cacheEnd = cachedBegin + indexToTimestamp(cashedData.length - 1);

    // if (begin > cacheEnd || cachedBegin > end) {
    //     return getData(begin, end);
    // }

    // let usableCachedData: Uint8Array = cashed ?? Buffer.from([]);

    // const cacheRange = { begin: cachedBegin, end: cacheEnd };

    // const beginDelta =
    //     timestampToIndex(begin) - timestampToIndex(cachedBegin ?? 0);
    // if (beginDelta > 0) {
    //     cacheRange.begin += indexToTimestamp(beginDelta);
    //     usableCachedData = usableCachedData.subarray(beginDelta * (4 + 2));
    // }

    // const endDelta = timestampToIndex(cacheEnd ?? 0) - timestampToIndex(end);
    // if (endDelta > 0) {
    //     cacheRange.end -= indexToTimestamp(endDelta);
    //     usableCachedData = usableCachedData.subarray(
    //         0,
    //         (usableCachedData.length - endDelta) * 4 + 2
    //     );
    // }

    // let frontData: Buffer = Buffer.from([]);
    // if (cacheRange.begin > begin) {
    //     frontData = getData(begin, cacheRange.begin - indexToTimestamp(1));
    // }

    // let backData: Buffer = Buffer.from([]);
    // if (end > cacheRange.end) {
    //     backData = getData(cacheRange.end + indexToTimestamp(1), end);
    // }

    // const result = new Uint8Array(
    //     frontData.length + usableCachedData.length + backData.length
    // );

    // result.set(frontData);
    // result.set(usableCachedData, frontData.length);
    // result.set(backData, frontData.length + usableCachedData.length);

    // const timeStamp = DataManager().getTimestamp();

    // const expectedDataSize =
    //     timestampToIndex(Math.min(timeStamp, end)) -
    //     timestampToIndex(begin) +
    //     1;
    // console.log(`Read ${expectedDataSize} `);
    // if (expectedDataSize !== result.length / (4 + 2) && end <= timeStamp) {
    //     usageData.sendErrorReport(
    //         `Unexpected result when merging cached and read data.
    //         begin: ${begin},
    //         end: ${end},
    //         frontDataRead: ${frontData.length},
    //         cacheDataUsed: ${usableCachedData.length / (4 + 2)},
    //         endDataRead: ${backData.length},
    //         expectedLength: ${expectedDataSize},
    //         resultLength: ${result.length / (4 + 2)},
    //         cacheRange: {begin: ${cacheRange.begin}, end: ${cacheRange.end}}`
    //     );
    // }

    // return result;
};

const getData = (fromTime: number, toTime: number) => {
    const result = loadNeededData(
        fromTime,
        toTime,
        (begin: number, end: number) => {
            if (options.fileHandel === undefined) return Buffer.from([]);
            const numberOfElements =
                timestampToIndex(end) - timestampToIndex(begin) + 1;
            const position = timestampToIndex(begin) * (4 + 2);
            const noOfBytes = numberOfElements * (4 + 2);
            const buffer = Buffer.alloc(noOfBytes);
            const bytesRead = fs.readSync(
                options.fileHandel,
                buffer,
                0,
                noOfBytes,
                position
            );
            return buffer.subarray(0, bytesRead);
        },
        cashedData
    );

    const timeStamp = DataManager().getTimestamp();
    if (timeStamp < toTime) {
        cashedData = result.slice(
            0,
            (timestampToIndex(timeStamp) - timestampToIndex(fromTime) + 1) *
                (4 + 2)
        );
    } else {
        cashedData = result;
    }

    // console.log('cashedData length', cashedData.length / (4 + 2));

    return result;
};
const getTimestamp = () =>
    !options.timestamp ? 0 : options.timestamp - options.samplingTime;

export const normalizeTime = (time: number) =>
    indexToTimestamp(timestampToIndex(time));

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
    getData: (fromTime = 0, toTime = getTimestamp()) => {
        const result = new FileData(
            Buffer.from(getData(fromTime, toTime).buffer)
        );

        cachedBegin = indexToTimestamp(timestampToIndex(fromTime));

        return result;
    },

    getTimestamp,
    addData: async (data: number, bitData: number) => {
        if (options.fileHandel === undefined) return;

        await fs.appendFile(
            options.fileHandel,
            new Uint8Array(Float32Array.from([data]).buffer),
            () => {}
        );
        await fs.appendFile(
            options.fileHandel,
            new Uint8Array(Uint16Array.from([bitData]).buffer),
            () => {}
        );

        options.timestamp = (options.timestamp ?? 0) + options.samplingTime;
    },
    reset: () => {
        if (options.fileHandel) {
            fs.closeSync(options.fileHandel);
            fs.unlinkSync('C:\\Workspace\\ppk\\test.dat');
        }
        options.samplingTime = initialSamplingTime;
        options.samplesPerSecond = initialSamplesPerSecond;
        options.samplingDuration = undefined;
        options.timestamp = 0;
        cachedBegin = undefined;
    },
    initialize: (samplingDuration: number) => {
        options.samplingDuration = samplingDuration * microSecondsPerSecond;
        options.fileHandel = fs.openSync('C:\\Workspace\\ppk\\test.dat', 'as+');

        // TODO Same Metadata
    },

    getTotalSavedRecords: () =>
        options.timestamp ? timestampToIndex(getTimestamp()) + 1 : 0,
    getSamplingDuration: () => options.samplingDuration ?? 0,
    getMetadata: () => ({
        samplesPerSecond: options.samplesPerSecond,
        samplingTime: options.samplingTime,
        timestamp: options.timestamp,
    }),
    loadData: (data: Float32Array, bits: Uint16Array, timestamp: number) => {
        // options.data = data;
        // options.bits = bits;
        options.timestamp = timestamp;
    },
    getNumberOfSamplesInWindow: (windowDuration: number) =>
        timestampToIndex(windowDuration),
});

/**
 * Get the sampling time derived from samplesPerSecond
 * @param {number} samplingRate number of samples per second
 * @returns {number} samplingTime which is the time in microseconds between samples
 */
export const getSamplingTime = (samplingRate: number): number =>
    microSecondsPerSecond / samplingRate;

export const getSamplesPerSecond = () => options.samplesPerSecond;

export const timestampToIndex = (timestamp: number): number =>
    timestamp < 0
        ? -1
        : Math.floor(
              (timestamp * options.samplesPerSecond) / microSecondsPerSecond
          );

export const indexToTimestamp = (index: number): number =>
    index >= 0 ? (microSecondsPerSecond * index) / options.samplesPerSecond : 0;

export const getTotalDurationInMicroSeconds = () => options.samplingDuration;

export const updateTitle = (info?: string | null) => {
    const title = getCurrentWindow().getTitle().split(':')[0].trim();
    getCurrentWindow().setTitle(`${title}${info ? ':' : ''} ${info || ''}`);
};
