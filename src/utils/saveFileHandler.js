/* Copyright (c) 2015 - 2021, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
