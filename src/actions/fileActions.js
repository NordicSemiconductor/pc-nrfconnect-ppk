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
import bson from 'bson';
import { remote } from 'electron';
import { join } from 'path';
import { getAppDataDir } from 'nrfconnect/core';
import { options } from '../globals';
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

    const fd = fs.openSync(filename, 'w');

    const buf = Buffer.alloc(4);
    const { data, bits, ...opts } = options;

    let objbuf = bson.serialize(opts);
    buf.writeUInt32LE(objbuf.byteLength);
    fs.writeSync(fd, buf);
    fs.writeSync(fd, objbuf);

    objbuf = bson.serialize(getState().app.chart);
    buf.writeUInt32LE(objbuf.byteLength);
    fs.writeSync(fd, buf);
    fs.writeSync(fd, objbuf);

    objbuf = Buffer.from(options.data.buffer);
    buf.writeUInt32LE(objbuf.byteLength);
    fs.writeSync(fd, buf);
    fs.writeSync(fd, objbuf);

    if (options.bits) {
        objbuf = Buffer.from(options.bits.buffer);
        buf.writeUInt32LE(objbuf.byteLength);
        fs.writeSync(fd, buf);
        fs.writeSync(fd, objbuf);
    }
    fs.closeSync(fd);
};

export const load = () => async dispatch => {
    const [filename] = (await dialog.showOpenDialog({
        defaultPath: getAppDataDir(),
    })) || [];
    if (!filename) {
        return;
    }

    const fd = fs.openSync(filename, 'r');

    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4);
    let objbuf = Buffer.alloc(buf.readUInt32LE());
    fs.readSync(fd, objbuf, 0, objbuf.byteLength);
    const opts = bson.deserialize(objbuf);

    Object.assign(options, opts);

    fs.readSync(fd, buf, 0, 4);
    objbuf = Buffer.alloc(buf.readUInt32LE());
    fs.readSync(fd, objbuf, 0, objbuf.byteLength);
    const chartState = bson.deserialize(objbuf);

    fs.readSync(fd, buf, 0, 4);
    const dataLength = buf.readUInt32LE();
    if (options.data.length !== dataLength / Float32Array.BYTES_PER_ELEMENT) {
        options.data = new Float32Array(dataLength / Float32Array.BYTES_PER_ELEMENT);
        options.data.fill(NaN);
    }
    objbuf = Buffer.from(options.data.buffer);
    fs.readSync(fd, objbuf, 0, objbuf.byteLength);

    if (fs.readSync(fd, buf, 0, 4) === 4) {
        const bitsLength = buf.readUInt32LE();
        if (bitsLength) {
            if ((options.bits || []).length !== bitsLength) {
                options.bits = new Uint8Array(bitsLength);
            }
        } else {
            options.bits = null;
        }
    } else {
        options.bits = null;
    }
    if (options.bits) {
        objbuf = Buffer.from(options.bits.buffer);
        fs.readSync(fd, objbuf, 0, objbuf.byteLength);
    }

    fs.closeSync(fd);

    dispatch(setChartState(chartState));
};
