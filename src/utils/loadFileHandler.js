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
import { deserialize } from 'bson';
import { createInflateRaw } from 'zlib';
import { Writable } from 'stream';

const setupBuffer = async filename => {
    const buffer = Buffer.alloc(370 * 1e6);
    let size = 0;
    const content = new Writable({
        write(chunk, _encoding, callback) {
            chunk.copy(buffer, size, 0);
            size += chunk.length;
            callback();
        },
    });

    await new Promise(resolve =>
        fs
            .createReadStream(filename)
            .pipe(createInflateRaw())
            .pipe(content)
            .on('finish', resolve)
    );
    return buffer.slice(0, size);
};

export default () => ({
    buffer: null,
    pos: 0,
    len: null,

    async initialise(filename) {
        this.buffer = await setupBuffer(filename);
        this._moveBufferPointer();
    },
    load() {
        let metadata = this._loadMetadata();
        if (!Object.prototype.hasOwnProperty.call(metadata, 'version')) {
            // no version property means that it's a legacy save file
            metadata = this._handleLegacyFiles(metadata);
        }
        const dataBuffer = this._loadBuffer();
        let bits = null;
        if (this.pos < this.buffer.length) {
            bits = this._loadBits();
        }
        return {
            dataBuffer,
            metadata,
            bits,
        };
    },
    _loadMetadata() {
        const result = deserialize(
            this.buffer.slice(this.pos, this.pos + this.len)
        );
        this._moveBufferPointer();
        return result;
    },
    _loadBuffer() {
        const result = new Float32Array(
            new Uint8Array(
                this.buffer.slice(this.pos, this.pos + this.len)
            ).buffer
        );
        this._moveBufferPointer();
        return result;
    },
    _loadBits() {
        return new Uint16Array(
            new Uint8Array(
                this.buffer.slice(this.pos, this.pos + this.len)
            ).buffer
        );
    },
    _moveBufferPointer() {
        this.pos += this.len;
        this.len = this.buffer.slice(this.pos, this.pos + 4).readUInt32LE();
    },
    /* Old save file format had two subsequent objects containing the global
    options object and the chartState respectively, so we call loadMetadata
    once more to get the remaining data */
    _handleLegacyFiles(metadata) {
        const additionalData = this._loadMetadata();
        return {
            options: { ...metadata, currentPane: metadata.currentPane },
            chartState: { ...additionalData },
        };
    },
});
