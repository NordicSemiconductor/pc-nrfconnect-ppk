/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';
import describeError from '@nordicsemiconductor/pc-nrfconnect-shared/src/logging/describeError';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

import { DataManager, GlobalOptions } from '../globals';
import { ChartState } from '../slices/chartSlice';
import { DataLoggerState } from '../slices/dataLoggerSlice';
import { calcFileSize } from './fileUtils';

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
        recordingDuration: number;
    };
}
const CURRENT_VERSION = 2;

export default async (
    filename: string,
    metadata: PPK2Metadata,
    sessionFolder: string,
    onProgress: (message: string, percentage: number) => void
) => {
    const metaPath = path.join(sessionFolder, 'metadata.json');
    DataManager().saveMinimap(sessionFolder);
    fs.writeFileSync(
        metaPath,
        JSON.stringify({ ...metadata, formatVersion: CURRENT_VERSION })
    );

    let folderSizeInBytes = 0;
    fs.readdirSync(sessionFolder).forEach(d => {
        folderSizeInBytes += fs.statSync(path.join(sessionFolder, d)).size;
    });
    const output = fs.createWriteStream(filename);
    const archive = archiver('zip', {
        zlib: { level: 9 }, // Sets the compression level.
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

    archive.on('progress', progress => {
        const percent = Math.round(
            (progress.fs.processedBytes / folderSizeInBytes) * 100.0
        );

        onProgress(
            `Compressing files, processed ${calcFileSize(
                progress.entries.processed
            )} of ${calcFileSize(progress.entries.total)} `,
            percent
        );
    });

    archive.directory(sessionFolder, false);

    await archive.finalize();
    fs.rmSync(metaPath);
};
