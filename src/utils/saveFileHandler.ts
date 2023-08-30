/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { serialize } from 'bson';
import fs from 'fs';
import { createDeflateRaw, DeflateRaw } from 'zlib';

import { GlobalOptions } from '../globals';

export interface SaveData {
    data: Float32Array;
    bits: Uint16Array | null;
    metadata: {
        options: Omit<GlobalOptions, 'data' | 'bits'>;
        chartState: unknown;
        triggerState: unknown;
        dataLoggerState: unknown;
    };
}

const CURRENT_VERSION = 1;

const write = (deflateRaw: DeflateRaw) => (data: unknown) =>
    new Promise(resolve => {
        deflateRaw.write(data, 'binary', resolve);
    });

const writeBuffer = async (
    data: Float32Array | Uint16Array | null,
    fileWriter: (data: unknown) => Promise<unknown>
) => {
    if (!data || data.buffer == null) return;
    const { buffer } = data;
    const buf = Buffer.alloc(4);
    const objbuf = Buffer.from(buffer);
    buf.writeUInt32LE(objbuf.byteLength);
    await fileWriter(buf);
    await fileWriter(objbuf);
};

const initialise = (filename: string) => {
    const file = fs.createWriteStream(filename);
    file.on('error', err => console.log(err.stack));
    const deflateRaw = createDeflateRaw();
    deflateRaw.pipe(file);
    return deflateRaw;
};

const save = async (
    saveData: SaveData,
    fileWriter: (data: unknown) => Promise<unknown>
) => {
    fileWriter(serialize({ ...saveData.metadata, version: CURRENT_VERSION }));

    await writeBuffer(saveData.data, fileWriter);
    if (saveData.bits) {
        await writeBuffer(saveData.bits, fileWriter);
    }
};

export default async (filename: string, saveData: SaveData) => {
    const deflateRaw = initialise(filename);
    const fileWriter = write(deflateRaw);

    if (!saveData) return false;
    try {
        await save(saveData, fileWriter);
    } catch (err) {
        logger.error(`Error saving state to ${filename}`);
        return false;
    } finally {
        deflateRaw.end();
    }
    return true;
};
