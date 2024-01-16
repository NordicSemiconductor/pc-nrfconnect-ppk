/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { getCurrentWindow } from '@electron/remote';
import os from 'os';
import path from 'path';
import { v4 } from 'uuid';

import { FileBuffer } from './utils/FileBuffer';
import { FoldingBuffer } from './utils/foldingBuffer';

export const bufferLengthInSeconds = 60 * 5;
export const numberOfDigitalChannels = 8;

const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;
export const microSecondsPerSecond = 1e6;

export interface GlobalOptions {
    /** The number of samples per second */
    samplesPerSecond: number;
    /** @var index: pointer to the index of the last sample in data array */
    timestamp?: number;
    fileBuffer?: FileBuffer;
    foldingBuffer?: FoldingBuffer;
    systemInitialTime?: number;
}
const options: GlobalOptions = {
    samplesPerSecond: initialSamplesPerSecond,
};

class FileData {
    data: Uint8Array;
    constructor(data: Readonly<Uint8Array>) {
        this.data = data;
    }

    getAllCurrentData() {
        const numberOfElements = this.getLength();
        const result = new Uint8Array(numberOfElements * 4);
        for (let index = 0; index < numberOfElements; index += 1) {
            const byteOffset = index * (4 + 2);
            result.set(result.subarray(byteOffset, byteOffset + 4), index * 4);
        }

        return new Float32Array(result.buffer);
    }

    getCurrentData(index: number) {
        const byteOffset = index * (4 + 2);

        // Create a buffer
        const buf = new ArrayBuffer(4);
        const view = new DataView(buf);

        const data = this.data.subarray(byteOffset, byteOffset + 4);
        if (data.length !== 4) {
            throw new Error('Index out of range');
        }

        data.forEach((b, i) => {
            view.setUint8(i, b);
        });

        return view.getFloat32(0, true);
    }

    getAllBitData() {
        const numberOfElements = this.getLength();
        const result = new Uint8Array(numberOfElements * 2);
        for (let index = 0; index < numberOfElements; index += 1) {
            const byteOffset = index * (4 + 2) + 4;
            result.set(result.subarray(byteOffset, byteOffset + 2), index * 2);
        }

        return new Uint16Array(result.buffer);
    }

    getBitData(index: number) {
        const byteOffset = index * (4 + 2) + 4;

        // Create a buffer
        const buf = new ArrayBuffer(2);
        const view = new DataView(buf);

        const data = this.data.subarray(byteOffset, byteOffset + 2);
        if (data.length !== 2) {
            throw new Error('Index out of range');
        }

        data.forEach((b, i) => {
            view.setUint8(i, b);
        });

        return view.getUint16(0, true);
    }

    getLength() {
        return this.data.length / (4 + 2);
    }
}

const getTimestamp = () =>
    !options.timestamp
        ? 0
        : options.timestamp - getSamplingTime(options.samplesPerSecond);

export const normalizeTime = (time: number) =>
    indexToTimestamp(timestampToIndex(time));

export const DataManager = () => ({
    getSamplingTime: () => getSamplingTime(options.samplesPerSecond),
    getSamplesPerSecond: () => options.samplesPerSecond,
    setSamplesPerSecond: (samplesPerSecond: number) => {
        options.samplesPerSecond = samplesPerSecond;
    },
    getSessionFolder: () => options.fileBuffer?.getSessionFolder(),
    getData: async (fromTime = 0, toTime = getTimestamp()) => {
        if (options.fileBuffer === undefined) {
            return new FileData(Buffer.from([]));
        }

        const numberOfElements =
            timestampToIndex(toTime) - timestampToIndex(fromTime) + 1;
        const byteOffset = timestampToIndex(fromTime) * (4 + 2);
        const numberOfBytesToRead = numberOfElements * (4 + 2);

        const buffer = await options.fileBuffer.read(
            byteOffset,
            numberOfBytesToRead
        );
        if (buffer.length !== numberOfBytesToRead) {
            console.log(
                `missing ${
                    (numberOfBytesToRead - buffer.length) / (4 + 2)
                } records`
            );
        }
        return new FileData(buffer);
    },

    getTimestamp,
    isInSync: () => {
        const actualTimePassed =
            performance.now() - (options.systemInitialTime ?? 0);
        const simulationDelta = getTimestamp() / 1000;
        if (simulationDelta > actualTimePassed) return true;

        const pcAheadDelta = actualTimePassed - simulationDelta;
        if (pcAheadDelta > getSamplingTime(options.samplesPerSecond) * 1.5) {
            return false;
        }
        return true;
    },
    addData: (current: number, bits: number) => {
        if (options.fileBuffer === undefined) return;

        const currentBuffer = new Uint8Array(
            Float32Array.from([current]).buffer
        );
        const bitBuffer = new Uint8Array(Uint16Array.from([bits]).buffer);
        const bufferToSend = new Uint8Array(
            currentBuffer.length + bitBuffer.length
        );

        bufferToSend.set(currentBuffer);
        bufferToSend.set(bitBuffer, currentBuffer.length);

        options.fileBuffer.append(bufferToSend);
        options.timestamp =
            options.timestamp === undefined
                ? 0
                : options.timestamp + getSamplingTime(options.samplesPerSecond);

        if (options.timestamp === 0) {
            options.systemInitialTime = performance.now();
        }

        options.foldingBuffer?.addData(current, options.timestamp);
    },
    flush: () => {
        options.fileBuffer?.flush();
    },
    reset: () => {
        const temp = { ...options };
        temp.fileBuffer?.close().then(() => temp.fileBuffer?.release());
        options.fileBuffer = undefined;
        options.foldingBuffer = undefined;
        options.samplesPerSecond = initialSamplesPerSecond;
        options.timestamp = undefined;
    },
    initialize: (fileBufferFolder?: string) => {
        const sessionFile = path.join(fileBufferFolder ?? os.tmpdir(), v4());
        options.fileBuffer = new FileBuffer(
            10 * options.samplesPerSecond * 6, // 6 bytes per sample for and 10sec buffers
            60 * options.samplesPerSecond * 6,
            sessionFile
        );
        options.foldingBuffer = new FoldingBuffer();
    },

    getTotalSavedRecords: () =>
        options.timestamp ? timestampToIndex(getTimestamp()) + 1 : 0,

    loadData: (timestamp: number, sessionPath: string) => {
        options.fileBuffer = new FileBuffer(
            10 * options.samplesPerSecond * 6,
            60 * options.samplesPerSecond * 6,
            sessionPath
        );
        options.foldingBuffer = new FoldingBuffer();
        options.foldingBuffer.loadFromFile(sessionPath);
        options.timestamp = timestamp;
    },
    getNumberOfSamplesInWindow: (windowDuration: number) =>
        timestampToIndex(windowDuration),
    getMinimapData: () => options.foldingBuffer?.getData() ?? [],
    saveMinimap: (sessionPath: string) => {
        options.foldingBuffer?.saveToFile(sessionPath);
    },
});

/**
 * Get the sampling time derived from samplesPerSecond
 * @param {number} samplingRate number of samples per second
 * @returns {number} samplingTime which is the time in microseconds between samples
 */
const getSamplingTime = (samplingRate: number): number =>
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

export const updateTitle = (info?: string | null) => {
    const title = getCurrentWindow().getTitle().split(':')[0].trim();
    getCurrentWindow().setTitle(`${title}${info ? ':' : ''} ${info || ''}`);
};
