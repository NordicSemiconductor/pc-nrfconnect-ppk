/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { getCurrentWindow } from '@electron/remote';
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
}
const options: GlobalOptions = {
    samplesPerSecond: initialSamplesPerSecond,
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
        buffer: Buffer,
        fromTime = 0,
        toTime = getTimestamp(),
        bias: 'start' | 'end' | undefined = undefined,
        onLoading: (loading: boolean) => void = () => {}
    ) => {
        // NOTE: only one getData per buffer should bhe executed at any given time

        if (options.fileBuffer === undefined) {
            return new FileData(Buffer.alloc(0), 0);
        }

        const numberOfElements =
            timestampToIndex(toTime) - timestampToIndex(fromTime) + 1;
        const byteOffset = timestampToIndex(fromTime) * frameSize;
        const numberOfBytesToRead = numberOfElements * frameSize;

        if (buffer.length < numberOfBytesToRead) {
            throw new Error('Buffer is too small');
        }

        const readBytes = await options.fileBuffer.read(
            buffer,
            byteOffset,
            numberOfBytesToRead,
            bias,
            onLoading
        );

        if (readBytes !== numberOfBytesToRead) {
            console.log(
                `missing ${
                    (numberOfBytesToRead - readBytes) / frameSize
                } records`
            );
        }
        return new FileData(buffer, readBytes);
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
        options.foldingBuffer = undefined;
        options.samplesPerSecond = initialSamplesPerSecond;
        options.timestamp = undefined;
    },
    initialize: (sessionRootPath: string) => {
        const sessionPath = path.join(sessionRootPath, v4());

        options.fileBuffer = new FileBuffer(
            10 * 100_000 * 6, // 6 bytes per sample for and 1sec buffers
            10 * 100_000 * 6,
            sessionPath,
            14,
            30
        );
        options.foldingBuffer = new FoldingBuffer();
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
