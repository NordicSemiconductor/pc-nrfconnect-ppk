/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { deserialize } from 'bson';
import fs from 'fs';
import { pipeline, Writable } from 'stream';
import { promisify } from 'util';
import { createInflateRaw } from 'zlib';

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
 * @returns {[int, Buffer]} size of decompressed file in bytes and the buffer with the content.
 */
const getContentFromFile = async (buffer, filename) => {
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
    return [size, buffer.slice(0, size)];
};

/**
 * @brief Setup buffer with decompressed data from .ppk file.
 * @param {string} filename .ppk file to load data from.
 * @returns {Buffer} three functions that returns copies of buffers.
 */
const setupBuffer = async filename => {
    let buffer = Buffer.alloc(1);
    let requiredBufferSize = 0;
    // First call to get required buffer size of decompressed file.
    [requiredBufferSize, buffer] = await getContentFromFile(buffer, filename);
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
        hasBitsData() {
            return pos >= buffer.length;
        },
    };
};

/* Old save file format had two subsequent objects containing the global
options object and the chartState respectively, so we call loadMetadata
once more to get the remaining data */
const handleLegacyFiles = (buffer, metadata) => {
    const additionalData = deserialize(buffer.readInitialChunk());
    return {
        options: { ...metadata, currentPane: metadata.currentPane },
        chartState: { ...additionalData },
    };
};

const loadMetadata = buffer => {
    const metadata = deserialize(buffer.readInitialChunk());
    if (metadata.version == null) {
        // no version property means that it's a legacy save file
        return handleLegacyFiles(buffer, metadata);
    }

    return metadata;
};

const loadData = buffer =>
    new Float32Array(new Uint8Array(buffer.readChunk()).buffer);

const loadBits = buffer =>
    buffer.hasBitsData()
        ? null
        : new Uint16Array(new Uint8Array(buffer.readChunk()).buffer);

export default async filename => {
    try {
        const buffer = await setupBuffer(filename);
        return {
            metadata: loadMetadata(buffer),
            dataBuffer: loadData(buffer),
            bits: loadBits(buffer),
        };
    } catch (err) {
        return false;
    }
};
