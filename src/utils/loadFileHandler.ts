/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO: only temporary whilst refactoring from javascript */

import { logger, telemetry } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { deserialize, Document as BsonDocument } from 'bson';
import { Buffer, kMaxLength as maxBufferLengthForSystem } from 'buffer';
import fs from 'fs';
import { unit } from 'mathjs';
import path from 'path';
import { pipeline, Transform, Writable } from 'stream';
import unzipper from 'unzipper';
import { promisify } from 'util';
import { v4 } from 'uuid';
import { createInflateRaw } from 'zlib';

import { startPreventSleep, stopPreventSleep } from '../features/preventSleep';
import {
    AddSession,
    SessionFlag,
    UpdateSessionData,
} from '../features/recovery/SessionsListFileHandler';
import { DataManager, timestampToIndex } from '../globals';
import { canFileFit } from './fileUtils';
import saveFile, { PPK2Metadata } from './saveFileHandler';

/*
        File outline .ppk v1
     _______________________
    |        4 bytes        |   <-- This section should ALWAYS be included
    |  Length of metadata   |
    |-----------------------|
    |  X bytes of metadata  |   <-- This section should ALWAYS be included
    |                       |
    |-----------------------|
    |        4 bytes        |   <-- This section should ALWAYS be included
    | Length of data buffer |
    |-----------------------|
    | Y bytes of data buffer|   <-- This section should ALWAYS be included
    |                       |
    |-----------------------|
    |        4 bytes        |   <-- This section is not always included.
    |  Length of bit data   |
    |-----------------------|
    |  Y bytes of bit data  |   <-- This section is not always included.
    |                       |
    |-----------------------|
*/

/**
 * Read and decompress .ppk file
 * @param {Buffer} buffer to hold the decompressed content of file.
 * @param {string} filename of file containing the power profile.
 * @returns {[number, Buffer]} size of decompressed file in bytes and the buffer with the content.
 */
const getContentFromFile = async (buffer: Buffer, filename: string) => {
    let size = 0;
    const content = new Writable({
        write(chunk, _encoding, callback) {
            chunk.copy(buffer, size, 0);
            size += chunk.length;
            callback();
        },
    });

    try {
        await promisify(pipeline)(
            fs.createReadStream(filename),
            createInflateRaw(),
            content
        );
    } catch (err) {
        console.error('Error while loading file', err);
    }
    return [size, buffer.slice(0, size)] as const;
};

/**
 * @brief Setup buffer with decompressed data from .ppk file.
 * @param {string} filename .ppk file to load data from.
 * @returns {Buffer} three functions that returns copies of buffers.
 */
const setupBuffer = async (filename: string) => {
    let buffer = Buffer.alloc(1);
    let requiredBufferSize = 0;
    // First call to get required buffer size of decompressed file.
    [requiredBufferSize, buffer] = await getContentFromFile(buffer, filename);

    if (requiredBufferSize > maxBufferLengthForSystem) {
        logger.error(
            `The file: ${filename} requires ${unit(
                requiredBufferSize,
                'bytes'
            )}, but the application you are using is limited to ${unit(
                maxBufferLengthForSystem,
                'bytes'
            )}`
        );
        return null;
    }

    buffer = Buffer.alloc(requiredBufferSize);
    // Second call to copy all decompressed data into buffer.
    [requiredBufferSize, buffer] = await getContentFromFile(buffer, filename);

    let pos = 0;
    return {
        readInitialChunk() {
            const len = buffer.slice(pos, pos + 4).readUInt32LE();
            const chunk = buffer.slice(pos, pos + len);
            pos += len;

            return chunk;
        },
        readChunk() {
            const len = buffer.slice(pos, pos + 4).readUInt32LE();
            pos += 4;
            const chunk = buffer.slice(pos, pos + len);
            pos += len;

            return chunk;
        },
    };
};

type BufferReader = Awaited<ReturnType<typeof setupBuffer>>;

/* Old save file format had two subsequent objects containing the global
options object and the chartState respectively, so we call loadMetadata
once more to get the remaining data */

const handleLegacyFiles = (buffer: BufferReader, metadata: BsonDocument) => {
    const additionalData = deserialize(buffer!.readInitialChunk());
    return {
        options: { ...metadata, currentPane: metadata.currentPane },
        chartState: { ...additionalData },
    };
};

const loadMetadata = (buffer: BufferReader) => {
    const metadata = deserialize(buffer!.readInitialChunk());
    if (metadata.version == null) {
        // no version property means that it's a legacy save file
        return handleLegacyFiles(buffer, metadata);
    }

    return metadata;
};

const loadData = (buffer: BufferReader) =>
    new Float32Array(new Uint8Array(buffer!.readChunk()).buffer);

const loadBits = (buffer: BufferReader) =>
    new Uint16Array(new Uint8Array(buffer!.readChunk()).buffer);

const loadPPK2File = async (
    filename: string,
    sessionRootPath: string,
    minSpaceTriggerLimit: number,
    onProgress: (message: string, percentage: number) => void
) => {
    let progress = 0;
    let lastUpdate = 0;

    const sessionPath = path.join(sessionRootPath, v4());
    const sessionFilePath = path.join(sessionPath, 'session.raw');
    fs.mkdirSync(sessionPath);
    const cleanUp = () => {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    };
    window.addEventListener('beforeunload', cleanUp);

    AddSession(0, 0, SessionFlag.PPK2Loaded, sessionFilePath);

    try {
        let totalSize = 0;

        const directory = await unzipper.Open.file(filename);

        await Promise.all(
            directory.files.map(
                f =>
                    new Promise<void>(resolve => {
                        f.stream().prependListener('pipe', () => {
                            totalSize += f.uncompressedSize;
                            resolve();
                        });
                    })
            )
        );

        const willFit = await canFileFit(
            minSpaceTriggerLimit,
            totalSize,
            sessionPath
        );

        if (!willFit) {
            throw new Error(
                'Cannot decompress. File does not fit in the available disk space'
            );
        }

        await Promise.all(
            directory.files.map(
                f =>
                    new Promise((resolve, reject) => {
                        f.stream()
                            .pipe(
                                new Transform({
                                    transform: (d, _, cb) => {
                                        progress += d.length;

                                        const roundToFixedPercentage =
                                            Math.trunc(
                                                (progress / totalSize) * 100
                                            );

                                        if (
                                            roundToFixedPercentage !==
                                            lastUpdate
                                        ) {
                                            onProgress(
                                                'Decompressing file',
                                                (progress / totalSize) * 100
                                            );
                                            lastUpdate = roundToFixedPercentage;
                                        }
                                        cb(null, d);
                                    },
                                })
                            )
                            .pipe(
                                fs.createWriteStream(
                                    path.join(sessionPath, f.path)
                                )
                            )
                            .on('error', reject)
                            .on('finish', resolve);
                    })
            )
        );

        logger.info(`Decompression session information to ${sessionPath}`);
        const metadata: PPK2Metadata = JSON.parse(
            fs.readFileSync(path.join(sessionPath, 'metadata.json')).toString()
        );

        UpdateSessionData({
            filePath: sessionFilePath,
            startTime: metadata.metadata.startSystemTime ?? Date.now(),
            samplingRate: metadata.metadata.samplesPerSecond,
        });

        DataManager().setSamplesPerSecond(metadata.metadata.samplesPerSecond);
        DataManager().loadData(sessionPath, metadata.metadata.startSystemTime);

        window.removeEventListener('beforeunload', cleanUp);
        return DataManager().getTimestamp();
    } catch (error) {
        window.removeEventListener('beforeunload', cleanUp);
        throw error;
    }
};

export default async (
    filename: string,
    sessionRootFolder: string,
    minSpaceTriggerLimit: number,
    onProgress: (
        message: string,
        percentage: number,
        indeterminate?: boolean
    ) => void
) => {
    if (filename.endsWith('.ppk2')) {
        return loadPPK2File(
            filename,
            sessionRootFolder,
            minSpaceTriggerLimit,
            onProgress
        );
    }

    logger.warn(`This PPK file format is deprecated.`);
    logger.warn(
        `Support for this format may be removed in any of the future versions.`
    );

    try {
        await startPreventSleep();
        const buffer = await setupBuffer(filename);

        onProgress('Extracting ppk file data', -1);
        const result = {
            metadata: loadMetadata(buffer),
            dataBuffer: loadData(buffer),
            bits: loadBits(buffer),
        };

        onProgress('Converting ".ppk" format to  ".ppk2"', -1);

        telemetry.sendEvent('Loading deprecated ".ppk" file format', {
            ppk: result.bits.length === 0 ? 'V1' : 'V2',
        });

        DataManager().initializeLiveSession(sessionRootFolder);
        DataManager().setSamplesPerSecond(
            result.metadata.options.samplesPerSecond
        );

        await loadPPKData(
            result.metadata.options.timestamp,
            result.dataBuffer,
            result.bits,
            onProgress
        );

        DataManager().getSessionBuffers().fileBuffer.clearStartSystemTime();

        const pos = filename.lastIndexOf('.');
        const newFilename = `${filename.substring(
            0,
            pos < 0 ? filename.length : pos
        )}.ppk2`;

        const session = DataManager().getSessionBuffers();

        if (
            !fs.existsSync(newFilename) &&
            session.fileBuffer.getSessionFolder()
        ) {
            await saveFile(
                newFilename,
                {
                    metadata: {
                        samplesPerSecond: DataManager().getSamplesPerSecond(),
                    },
                },
                session.fileBuffer,
                session.foldingBuffer,
                message => onProgress(message, -1, true)
            );

            logger.info(
                `File was converted from ".ppk" to the latest format ".ppk2" and saved to ${newFilename}`
            );
        }

        await stopPreventSleep();
        return DataManager().getTimestamp();
    } catch (err) {
        await stopPreventSleep();
        return false;
    }
};

const loadPPKData = (
    duration: number,
    current: Float32Array,
    bits: Uint16Array,
    onProgress: (message: string, percentage: number) => void
) =>
    new Promise<void>(resolve => {
        onProgress('Converting ".ppk" format to  ".ppk2"', 0);
        const maxIndex = Math.min(current.length, timestampToIndex(duration));
        const maxNumberOfSamplesToProcess = 100_0000;

        const process = (b: number, e: number) =>
            new Promise<{ begin: number; end: number }>(res => {
                setTimeout(() => {
                    for (let i = b; i < e; i += 1) {
                        DataManager().addData(current[i], bits[i] ?? 0xaaaa); // 0xAAAA is default when chanel are off used to mock old PPK1 kits
                    }
                    res({
                        begin: e,
                        end: Math.min(
                            e + maxNumberOfSamplesToProcess,
                            maxIndex
                        ),
                    });
                });
            }).then(range => {
                onProgress(
                    'Converting ".ppk" format to  ".ppk2"',
                    (range.end / maxIndex) * 100
                );
                if (range.end === maxIndex) {
                    resolve();
                } else {
                    process(range.begin, range.end);
                }
            });

        process(0, Math.min(maxIndex, maxNumberOfSamplesToProcess));
    });
