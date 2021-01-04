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
        this.len = this.buffer.slice(this.pos, this.pos + 4).readUInt32LE();
    },
    loadData() {
        let metadata = this._loadMetadata();
        // eslint-disable-next-line no-prototype-builtins
        if (metadata.hasOwnProperty('version')) {
            // new file
        } else {
            // Legacy data format
            const additionalData = this._loadMetadata();
            metadata = {
                options: { ...metadata, currentPane: metadata.currentPane },
                chartState: { ...additionalData },
            };
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
        const data = deserialize(
            this.buffer.slice(this.pos, this.pos + this.len)
        );
        this.pos += this.len;
        this.len = this.buffer.slice(this.pos, this.pos + 4).readUInt32LE();
        return data;
    },
    _loadBuffer() {
        this.pos += 4;
        const data = new Float32Array(
            new Uint8Array(
                this.buffer.slice(this.pos, this.pos + this.len)
            ).buffer
        );
        this.pos += this.len;
        this.len = this.buffer.slice(this.pos, this.pos + 4).readUInt32LE();
        return data;
    },
    _loadBits() {
        this.pos += 4;
        return new Uint16Array(
            new Uint8Array(
                this.buffer.slice(this.pos, this.pos + this.len)
            ).buffer
        );
    },
});
