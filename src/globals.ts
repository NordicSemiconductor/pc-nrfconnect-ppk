/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// FIXME: Will ned to remove the line under at some point.

import { getCurrentWindow } from '@electron/remote';
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

const getData = (fromTime: number, toTime: number) => {
    if (options.fileHandel === undefined) return Buffer.from([]);
    const numberOfElements =
        timestampToIndex(toTime) - timestampToIndex(fromTime) + 1;
    const position = timestampToIndex(fromTime) * (4 + 2);
    const numberOfBytes = numberOfElements * (4 + 2);
    const buffer = Buffer.alloc(numberOfBytes);
    const bytesRead = fs.readSync(
        options.fileHandel,
        buffer,
        0,
        numberOfBytes,
        position
    );
    if (bytesRead !== numberOfBytes) {
        console.log(`missing ${numberOfBytes - bytesRead / (4 + 2)} records`);
    }
    return buffer.subarray(0, bytesRead);
};
const getTimestamp = () =>
    !options.timestamp ? 0 : options.timestamp - options.samplingTime;

export const normalizeTime = (time: number) =>
    indexToTimestamp(timestampToIndex(time));

let writeBuffer: Uint8Array = new Uint8Array();
let writeBufferData = false;

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

        return result;
    },

    getTimestamp,
    addData: async (data: number, bitData: number) => {
        if (options.fileHandel === undefined) return;

        const writeToFile = (buffer: Uint8Array, fileHandel: number) =>
            new Promise<void>(resolve => {
                fs.appendFile(fileHandel, buffer, () => {
                    options.timestamp =
                        (options.timestamp ?? 0) +
                        options.samplingTime * (buffer.length / (4 + 2));
                    resolve();
                });
            }).then(() => {
                if (writeBuffer.length > 0) {
                    writeToFile(writeBuffer, fileHandel);
                    writeBuffer = new Uint8Array();
                } else {
                    writeBufferData = false;
                }
            });

        const currentBuffer = new Uint8Array(Float32Array.from([data]).buffer);
        const bitBuffer = new Uint8Array(Uint16Array.from([bitData]).buffer);
        const bufferToSend = new Uint8Array(
            writeBuffer.length + currentBuffer.length + bitBuffer.length
        );
        bufferToSend.set(writeBuffer);
        bufferToSend.set(currentBuffer, writeBuffer.length);
        bufferToSend.set(bitBuffer, writeBuffer.length + currentBuffer.length);
        if (!writeBufferData) {
            if (options.fileHandel) {
                writeBuffer = new Uint8Array();
                writeBufferData = true;
                await writeToFile(bufferToSend, options.fileHandel);
            }
        } else {
            writeBuffer = bufferToSend;
        }
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
