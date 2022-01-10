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

const setupBuffer = async filename => {
    let buffer = Buffer.alloc(370 * 1e6);
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
    buffer = buffer.slice(0, size);

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
        isDepleted() {
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
    buffer.isDepleted()
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
