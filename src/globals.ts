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

export const currentFrameSize = 4;
export const bitFrameSize = 2; // 6 bytes, 4 current 2 buts
export const frameSize = currentFrameSize + bitFrameSize; // 6 bytes, 4 current 2 buts
export const bufferLengthInSeconds = 60 * 5;
export const numberOfDigitalChannels = 8;

const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;
export const microSecondsPerSecond = 1e6;

const tempBuffer = new Uint8Array(6);
export interface GlobalOptions {
    /** The number of samples per second */
    samplesPerSecond: number;
    /** @var index: pointer to the index of the last sample in data array */
    timestamp?: number;
    fileBuffer?: FileBuffer;
    foldingBuffer?: FoldingBuffer;
    systemInitialTime?: number;
    readBuffer?: Buffer;
    readingData: boolean;
}
const options: GlobalOptions = {
    samplesPerSecond: initialSamplesPerSecond,
    readingData: false,
};

class FileData {
    data: Uint8Array;
    dataView: DataView;
    length: number;
    constructor(data: Readonly<Uint8Array>, length: number) {
        this.data = data;
        this.length = length;
        this.dataView = new DataView(this.data.buffer);
    }

    getAllCurrentData() {
        const numberOfElements = this.getLength();
        const result = new Uint8Array(numberOfElements * currentFrameSize);
        for (let index = 0; index < numberOfElements; index += 1) {
            const byteOffset = index * frameSize;
            result.set(
                result.subarray(byteOffset, byteOffset + currentFrameSize),
                index * currentFrameSize
            );
        }

        return new Float32Array(result.buffer);
    }

    getCurrentData(index: number) {
        const byteOffset = index * frameSize;

        if (this.length < byteOffset + currentFrameSize) {
            throw new Error('Index out of range');
        }

        return this.dataView.getFloat32(byteOffset, true);
    }

    getAllBitData() {
        const numberOfElements = this.getLength();
        const result = new Uint8Array(numberOfElements * 2);
        for (let index = 0; index < numberOfElements; index += 1) {
            const byteOffset = index * frameSize + currentFrameSize;
            result.set(result.subarray(byteOffset, byteOffset + 2), index * 2);
        }

        return new Uint16Array(result.buffer);
    }

    getBitData(index: number) {
        const byteOffset = index * frameSize + currentFrameSize;

        if (this.length < byteOffset + 2) {
            throw new Error('Index out of range');
        }

        return this.dataView.getUint16(byteOffset);
    }

    getLength() {
        return this.length / frameSize;
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
    getData: async (
        fromTime = 0,
        toTime = getTimestamp(),
        bias: 'start' | 'end' | undefined = undefined,
        onLoading: (loading: boolean) => void = () => {}
    ) => {
        if (options.readingData) {
            // given we only have file read buffer we need to consume the data
            // before we read again otherwise data will be over written
            throw new Error(
                'Only one read at a time can be called. Await result of previous call'
            );
        }

        if (options.fileBuffer === undefined) {
            return new FileData(Buffer.alloc(0), 0);
        }

        const numberOfElements =
            timestampToIndex(toTime) - timestampToIndex(fromTime) + 1;
        const byteOffset = timestampToIndex(fromTime) * frameSize;
        const numberOfBytesToRead = numberOfElements * frameSize;

        if (
            !options.readBuffer ||
            options.readBuffer.length < numberOfBytesToRead
        ) {
            options.readBuffer = Buffer.alloc(numberOfBytesToRead);
        }

        options.readingData = true;
        const readBytes = await options.fileBuffer.read(
            options.readBuffer,
            byteOffset,
            numberOfBytesToRead,
            bias,
            onLoading
        );
        options.readingData = false;
        if (readBytes !== numberOfBytesToRead) {
            console.log(
                `missing ${
                    (numberOfBytesToRead - readBytes) / frameSize
                } records`
            );
        }
        return new FileData(options.readBuffer, readBytes);
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

        const view = new DataView(tempBuffer.buffer);
        view.setFloat32(0, current, true);
        view.setUint16(4, bits);

        options.fileBuffer.append(tempBuffer);

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
        options.readBuffer = undefined;
        options.foldingBuffer = undefined;
        options.samplesPerSecond = initialSamplesPerSecond;
        options.timestamp = undefined;
        options.readingData = false;
    },
    initialize: (fileBufferFolder?: string) => {
        const sessionPath = path.join(fileBufferFolder ?? os.tmpdir(), v4());
        options.fileBuffer = new FileBuffer(
            10 * 100_000 * 6, // 6 bytes per sample for and 1sec buffers
            10 * 100_000 * 6,
            sessionPath,
            14,
            30
        );
        options.readBuffer = Buffer.alloc(20 * options.samplesPerSecond * 6); // we start with smaller buffer and let it grow organically
        options.foldingBuffer = new FoldingBuffer();
        options.readingData = false;
    },

    getTotalSavedRecords: () =>
        options.timestamp ? timestampToIndex(getTimestamp()) + 1 : 0,

    loadData: (timestamp: number, sessionPath: string) => {
        options.fileBuffer = new FileBuffer(
            10 * 100_000 * 6, // 6 bytes per sample for and 1sec buffers
            10 * 100_000 * 6,
            sessionPath,
            14,
            30
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
        : Math.trunc(
              (timestamp * options.samplesPerSecond) / microSecondsPerSecond
          );

export const indexToTimestamp = (index: number): number =>
    index >= 0 ? (microSecondsPerSecond * index) / options.samplesPerSecond : 0;

export const updateTitle = (info?: string | null) => {
    const title = getCurrentWindow().getTitle().split(':')[0].trim();
    getCurrentWindow().setTitle(`${title}${info ? ':' : ''} ${info || ''}`);
};
