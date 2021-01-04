/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */

import fs from 'fs';
import { createDeflateRaw } from 'zlib';
import { serialize } from 'bson';

export default () => ({
    deflateRaw: null,
    saveData: {},
    version: 1,

    initialise(filename, saveData) {
        this.saveData = saveData;
        const file = fs.createWriteStream(filename);
        file.on('error', err => console.log(err.stack));
        this.deflateRaw = createDeflateRaw();
        this.deflateRaw.pipe(file);
    },

    _write(data) {
        return new Promise(resolve =>
            this.deflateRaw.write(data, 'binary', resolve)
        );
    },

    async _writeBuffer() {
        if (!this.saveData.data) return;
        await this._createBuffer(this.saveData.data.buffer);
    },

    async _writeDigitalChannels() {
        if (!this.saveData.bits) return;
        await this._createBuffer(this.saveData.bits.buffer);
    },

    async _createBuffer(buffer) {
        const buf = Buffer.alloc(4);
        const objbuf = Buffer.from(buffer);
        buf.writeUInt32LE(objbuf.byteLength);
        await this._write(buf);
        await this._write(objbuf);
    },

    async writeFile() {
        if (this.saveData.metadata) {
            this._write(
                serialize({ ...this.saveData.metadata, version: this.version })
            );
        }

        await this._writeBuffer();
        await this._writeDigitalChannels();
        this.deflateRaw.end();
    },
});
