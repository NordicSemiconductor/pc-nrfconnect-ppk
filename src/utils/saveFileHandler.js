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

/* eslint-disable no-underscore-dangle */

import fs from 'fs';
import { createDeflateRaw } from 'zlib';
import { serialize } from 'bson';

export default () => ({
    deflateRaw: null,
    saveData: null,
    version: 1,

    initialise(filename, saveData) {
        this.saveData = saveData;
        const file = fs.createWriteStream(filename);
        file.on('error', err => console.log(err.stack));
        this.deflateRaw = createDeflateRaw();
        this.deflateRaw.pipe(file);
    },

    async _writeBuffer(data) {
        if (!data) return;
        const { buffer } = data;
        const buf = Buffer.alloc(4);
        const objbuf = Buffer.from(buffer);
        buf.writeUInt32LE(objbuf.byteLength);
        await this._write(buf);
        await this._write(objbuf);
    },
    _write(data) {
        return new Promise(resolve =>
            this.deflateRaw.write(data, 'binary', resolve)
        );
    },

    async save() {
        if (!this.saveData) return;
        await this._write(
            serialize({ ...this.saveData.metadata, version: this.version })
        );
        await this._writeBuffer(this.saveData.data);
        if (this.saveData.bits) {
            await this._writeBuffer(this.saveData.bits);
        }
        this.deflateRaw.end();
    },
});
