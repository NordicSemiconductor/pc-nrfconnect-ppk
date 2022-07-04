/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: only temporary whilst refactoring from javascript */
/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: only temporary whilst refactoring from javascript */

import EventEmitter from 'events';

import PPKCmd from '../constants';

const getAllPropertyNames = (obj: any): any => {
    const proto = Object.getPrototypeOf(obj);
    const inherited = proto ? getAllPropertyNames(proto) : [];
    return [...new Set(Object.getOwnPropertyNames(obj).concat(inherited))];
};

export function convertFloatToByteBuffer(floatnum: number): Uint8Array {
    const float = new Float32Array(1);
    float[0] = floatnum;
    const bytes = new Uint8Array(float.buffer);
    return bytes;
}

export default class Device extends EventEmitter {
    currentVdd = 0;
    triggerWindowRange = { min: 1, max: 10 };
    capabilities = {};

    constructor() {
        super();
        this.capabilities = {};
        getAllPropertyNames(this)
            .filter((k: any) => k.startsWith('ppk'))
            .forEach((k: any) =>
                Object.assign(this.capabilities, { [k]: true })
            );
        console.log('PPK2 capabilities: ');
        console.log(this.capabilities);
    }

    open() {
        throw new Error('not implemented');
    }

    sendCommand(...args: PPKCmd[]) {
        throw new Error('not implemented');
    }

    stop() {
        throw new Error('not implemented');
    }

    start() {
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

    ppkDeviceRunning(...args: PPKCmd) {
        return this.sendCommand([PPKCmd.DeviceRunningSet, ...args]);
    }

    ppkUpdateRegulator(vdd: number) {
        this.currentVdd = vdd;
        // eslint-disable-next-line no-bitwise
        return this.sendCommand([PPKCmd.RegulatorSet, vdd >> 8, vdd & 0xff]);
    }
}
