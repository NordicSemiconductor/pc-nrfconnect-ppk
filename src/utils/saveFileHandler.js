/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { serialize } from 'bson';
import fs from 'fs';
import { logger } from 'pc-nrfconnect-shared';
import { createDeflateRaw } from 'zlib';

const CURRENT_VERSION = 1;

const write = deflateRaw => data => {
    return new Promise(resolve => deflateRaw.write(data, 'binary', resolve));
};

const writeBuffer = async (data, fileWriter) => {
    if (!data || data.buffer == null) return;
    const { buffer } = data;
    const buf = Buffer.alloc(4);
    const objbuf = Buffer.from(buffer);
    buf.writeUInt32LE(objbuf.byteLength);
    await fileWriter(buf);
    await fileWriter(objbuf);
};

const initialise = filename => {
    const file = fs.createWriteStream(filename);
    file.on('error', err => console.log(err.stack));
    const deflateRaw = createDeflateRaw();
    deflateRaw.pipe(file);
    return deflateRaw;
};

const save = async (saveData, fileWriter) => {
    fileWriter(serialize({ ...saveData.metadata, version: CURRENT_VERSION }));

    await writeBuffer(saveData.data, fileWriter);
    if (saveData.bits) {
        await writeBuffer(saveData.bits, fileWriter);
    }
};

export default async (filename, saveData) => {
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
