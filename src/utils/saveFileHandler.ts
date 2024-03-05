/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger, telemetry } from '@nordicsemiconductor/pc-nrfconnect-shared';
import describeError from '@nordicsemiconductor/pc-nrfconnect-shared/src/logging/describeError';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';

import { startPreventSleep, stopPreventSleep } from '../features/preventSleep';
import { frameSize, GlobalOptions, indexToTimestamp } from '../globals';
import { ChartState } from '../slices/chartSlice';
import { DataLoggerState } from '../slices/dataLoggerSlice';
import EventAction from '../usageDataActions';
import { FileBuffer } from './FileBuffer';
import { calcFileSize } from './fileUtils';
import { FoldingBuffer } from './foldingBuffer';

export interface SaveData {
    data: Float32Array;
    bits: Uint16Array | null;
    metadata: {
        options: Omit<GlobalOptions, 'data' | 'bits'>;
        chartState: ChartState;
        dataLoggerState: DataLoggerState;
    };
}

export interface PPK2Metadata {
    metadata: {
        samplesPerSecond: number;
        startSystemTime?: number;
    };
}
const CURRENT_VERSION = 2;

export default async (
    filename: string,
    metadata: PPK2Metadata,
    fileBuffer: FileBuffer,
    foldingBuffer: FoldingBuffer,
    onProgress?: (message: string) => void
) => {
    await startPreventSleep();
    const sessionFolder = fileBuffer.getSessionFolder();
    if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder);
    }
    const metaPath = path.join(sessionFolder, 'metadata.json');

    await fileBuffer.flush();
    foldingBuffer.saveToFile(sessionFolder);

    fs.writeFileSync(
        metaPath,
        JSON.stringify({ ...metadata, formatVersion: CURRENT_VERSION })
    );

    const output = fs.createWriteStream(filename);
    const archive = archiver('zip', {
        zlib: { level: 6 }, // Sets the compression level.
    });

    archive.pipe(output);

    archive.on('warning', err => {
        if (err.code === 'ENOENT') {
            logger.warn(err.message);
        } else {
            logger.warn(describeError(err));
        }
    });
    archive.on('error', err => {
        logger.error(describeError(err));
    });

    let processed = 0;

    archive.on('data', data => {
        processed += data.length;

        onProgress?.(
            `Compressing Data. Compressed file size ${calcFileSize(processed)}`
        );
    });
    archive.directory(sessionFolder, false);

    const cleanUp = () => {
        fs.rmSync(filename, { recursive: true, force: true });
    };
    window.addEventListener('beforeunload', cleanUp);
    try {
        await archive.finalize();
        window.removeEventListener('beforeunload', cleanUp);
        fs.rmSync(metaPath);
        telemetry.sendEvent(EventAction.EXPORT_DATA, {
            timestampBegin: 0,
            timestampEnd: indexToTimestamp(
                fileBuffer.getSessionInBytes() / frameSize - 1,
                metadata.metadata.samplesPerSecond
            ),
            exportType: 'ppk2',
        });
        await stopPreventSleep();
    } catch (error) {
        window.removeEventListener('beforeunload', cleanUp);
        throw error;
    }
};
