/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import {
    FileData,
    frameSize,
    getSamplingTime,
    GlobalOptions,
} from '../globals';
import { FileBuffer } from './FileBuffer';
import { FoldingBuffer } from './foldingBuffer';

// TODO: Get possible rates from the defined rates somewhere in the project.
const possibleRates = [1, 10, 100, 1000, 10000, 100000];

const pageSize = 10 * 100 * frameSize; // 6 bytes per sample for and 10sec buffers at highest sampling rate
const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;

const stat = promisify(fs.stat);

const options: GlobalOptions = {
    samplesPerSecond: initialSamplesPerSecond,
    timeReachedTriggers: [],
    inSyncOffset: 0,
    lastInSyncTime: 0,
};

function calculateSamplesPerSecond(
    sessionStartTime: number,
    sessionEndTime: number,
    fileSize: number
) {
    if (sessionEndTime <= sessionStartTime) {
        throw new Error('Invalid session times');
    }

    const durationInSeconds = Math.floor(
        (sessionEndTime - sessionStartTime) / 1000
    );

    if (durationInSeconds <= 0) {
        throw new Error('Invalid duration of session');
    }

    const totalSamples = fileSize / frameSize;
    const samplesPerSecond = totalSamples / durationInSeconds;

    return possibleRates.reduce((prev, curr) =>
        Math.abs(curr - samplesPerSecond) < Math.abs(prev - samplesPerSecond)
            ? curr
            : prev
    );
}

async function finalizeRecovery(
    sessionPath: string,
    samplesPerSecond: number,
    startTime: number
) {
    try {
        await options.foldingBuffer?.saveToFile(sessionPath);
        await saveMetadataToFile(sessionPath, samplesPerSecond, startTime);
    } catch (error) {
        throw new Error(`Error finalizing recovery: ${error}`);
    }
}

async function saveMetadataToFile(
    sessionPath: string,
    samplesPerSecond: number,
    startSystemTime: number
) {
    const metadata = {
        metadata: {
            samplesPerSecond,
            startSystemTime,
        },
        formatVersion: 2,
    };

    const metadataPath = path.join(sessionPath, 'metadata.json');
    try {
        await fs.promises.writeFile(
            metadataPath,
            JSON.stringify(metadata, null, 2)
        );
    } catch (error) {
        throw new Error(`Error saving metadata: ${error}`);
    }
}

function processBuffer(buffer: Buffer, bytesRead: number, records: number) {
    const fileData = new FileData(buffer, bytesRead);

    for (let i = 0; i < fileData.getLength(); i += 1) {
        const measuredValue = fileData.getCurrentData(i);
        const measuredTime =
            records * getSamplingTime(options.samplesPerSecond);
        options.foldingBuffer?.addData(measuredValue, measuredTime);

        records += 1;
    }

    return records;
}

export const RecoverManager = () => ({
    async recoverSession(
        sessionPath: string,
        onProgress: (progress: number) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ) {
        const sessionFilePath = path.join(sessionPath, 'session.raw');
        const stats = await stat(sessionFilePath);

        const startTime = stats.birthtimeMs;
        const fileSize = stats.size;
        const endTime = stats.mtimeMs;

        options.samplesPerSecond = calculateSamplesPerSecond(
            startTime,
            endTime,
            fileSize
        );

        options.fileBuffer = new FileBuffer(
            pageSize,
            sessionPath,
            2,
            30,
            startTime
        );

        options.foldingBuffer = new FoldingBuffer();

        const buffer = Buffer.alloc(pageSize);
        let offset = 0;
        let recordCount = 0;

        const processChunk = async () => {
            try {
                if (offset >= fileSize) {
                    await finalizeRecovery(
                        sessionPath,
                        options.samplesPerSecond,
                        startTime
                    );
                    onComplete();
                    return;
                }

                const remainingBytes = fileSize - offset;
                const bytesToRead = Math.min(pageSize, remainingBytes);

                options.fileBuffer
                    ?.read(buffer, offset, bytesToRead)
                    .then(() => {
                        offset += bytesToRead;

                        recordCount = processBuffer(
                            buffer,
                            bytesToRead,
                            recordCount
                        );

                        const progress = (offset / fileSize) * 100;
                        onProgress(progress);

                        queueMicrotask(processChunk);
                    });
            } catch (error) {
                onError(new Error(`Error recovering session: ${error}`));
            }
        };

        queueMicrotask(processChunk);
    },
});
