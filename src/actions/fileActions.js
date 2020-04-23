/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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

import fs from 'fs';
import { serialize, deserialize } from 'bson';
import { createInflateRaw, createDeflateRaw } from 'zlib';
import { Writable } from 'stream';
import { remote } from 'electron';
import { join } from 'path';
import { logger, getAppDataDir } from 'nrfconnect/core';
import { options, timestampToIndex, indexToTimestamp } from '../globals';
import { setChartState } from '../reducers/chartReducer';

const { dialog } = remote;

export const save = () => async (_, getState) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const filename = await dialog.showSaveDialog({
        defaultPath: join(getAppDataDir(), `ppk-${timestamp}.dat`),
    });
    if (!filename) {
        return;
    }

    const file = fs.createWriteStream(filename);
    file.on('error', err => console.log(err.stack));

    const deflateRaw = createDeflateRaw();
    deflateRaw.pipe(file);

    const write = bf => new Promise(resolve => deflateRaw.write(bf, 'binary', resolve));

    const { data, bits, ...opts } = options;
    await write(serialize(opts));
    await write(serialize(getState().app.chart));

    const buf = Buffer.alloc(4);
    let objbuf = Buffer.from(options.data.buffer);
    buf.writeUInt32LE(objbuf.byteLength);
    await write(buf);
    await write(objbuf);

    if (options.bits) {
        objbuf = Buffer.from(options.bits.buffer);
        buf.writeUInt32LE(objbuf.byteLength);
        await write(buf);
        await write(objbuf);
    }
    deflateRaw.end();

    logger.info(`State saved to: ${filename}`);
};


export const load = () => async dispatch => {
    const [filename] = (await dialog.showOpenDialog({
        defaultPath: getAppDataDir(),
    })) || [];
    if (!filename) {
        return;
    }

    let buffer = Buffer.alloc(370 * 1e6);
    let size = 0;
    const content = new Writable({
        write(chunk, _encoding, callback) {
            chunk.copy(buffer, size, 0);
            size += chunk.length;
            callback();
        },
    });

    await new Promise(resolve => fs.createReadStream(filename)
        .pipe(createInflateRaw())
        .pipe(content)
        .on('finish', resolve));
    buffer = buffer.slice(0, size);

    let pos = 0;
    let len = buffer.slice(pos, pos + 4).readUInt32LE();
    Object.assign(options, deserialize(buffer.slice(pos, pos + len)));
    pos += len;

    len = buffer.slice(pos, pos + 4).readUInt32LE();
    const chartState = deserialize(buffer.slice(pos, pos + len));
    pos += len;

    len = buffer.slice(pos, pos + 4).readUInt32LE();
    pos += 4;
    options.data = new Float32Array(new Uint8Array(buffer.slice(pos, pos + len)).buffer);
    pos += len;

    if (pos < buffer.length) {
        len = buffer.slice(pos, pos + 4).readUInt32LE();
        pos += 4;
        options.bits = new Uint8Array(buffer.slice(pos, pos + len));
    } else {
        options.bits = null;
    }

    dispatch(setChartState(chartState));
    logger.info(`State restored from: ${filename}`);
};

export const exportChart = () => async (dispatch, getState) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const filename = await dialog.showSaveDialog({
        defaultPath: join(getAppDataDir(), `ppk-${timestamp}.csv`),
    });
    if (!filename) {
        return;
    }
    const fd = fs.openSync(filename, 'w');

    const {
        windowBegin,
        windowEnd,
        cursorBegin,
        cursorEnd,
        windowDuration,
        index,
    } = getState().app.chart;

    const end = windowEnd || options.timestamp;
    const begin = windowBegin || (end - windowDuration);

    const [from, to] = (cursorBegin === null) ? [begin, end] : [cursorBegin, cursorEnd];

    const indexBegin = Math.ceil(timestampToIndex(from, index));
    const indexEnd = Math.floor(timestampToIndex(to, index));

    fs.writeSync(fd, `Timestamp(ms),Current(uA)${options.bits ? ',Bits' : ''}\n`);
    for (let n = indexBegin; n <= indexEnd; n += 1) {
        const k = (n + options.data.length) % options.data.length;
        const v = options.data[k];
        if (!Number.isNaN(v)) {
            const bits = options.bits
                ? `,${options.bits[k].toString(2).padStart(8, '0')}`
                : '';
            fs.writeSync(fd, `${indexToTimestamp(n, index) / 1000},${v.toFixed(3)}${bits}\n`);
        }
    }

    fs.closeSync(fd);
};
