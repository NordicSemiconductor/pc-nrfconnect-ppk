/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import EventEmitter from 'events';

import PPKCmd from '../constants';

/* eslint-disable class-methods-use-this */

const getAllPropertyNames = obj => {
    const proto = Object.getPrototypeOf(obj);
    const inherited = proto ? getAllPropertyNames(proto) : [];
    return [...new Set(Object.getOwnPropertyNames(obj).concat(inherited))];
};

export function convertFloatToByteBuffer(floatnum) {
    const float = new Float32Array(1);
    float[0] = floatnum;
    const bytes = new Uint8Array(float.buffer);
    return bytes;
}

export default class Device extends EventEmitter {
    currentVdd = 0;

    triggerWindowRange = { min: 1, max: 10 };

    constructor() {
        super();
        this.capabilities = {};
        getAllPropertyNames(this)
            .filter(k => k.startsWith('ppk'))
            .forEach(k => Object.assign(this.capabilities, { [k]: true }));
    }

    async open() {
        throw new Error('not implemented');
    }

    async sendCommand() {
        throw new Error('not implemented');
    }

    async stop() {
        throw new Error('not implemented');
    }

    async start() {
        throw new Error('not implemented');
    }

    onSampleCallback() {
        throw new Error('not implemented');
    }

    parseMeta() {
        throw new Error('not implemented');
    }

    // Capability methods

    ppkAverageStart() {
        return this.sendCommand([PPKCmd.AverageStart]);
    }

    ppkAverageStop() {
        return this.sendCommand([PPKCmd.AverageStop]);
    }

    ppkDeviceRunning(...args) {
        return this.sendCommand([PPKCmd.DeviceRunningSet, ...args]);
    }

    ppkUpdateRegulator(vdd) {
        this.currentVdd = vdd;
        // eslint-disable-next-line no-bitwise
        return this.sendCommand([PPKCmd.RegulatorSet, vdd >> 8, vdd & 0xff]);
    }
}
