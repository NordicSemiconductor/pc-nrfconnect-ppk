/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import RTTDevice from './rttDevice';
import SerialDevice from './serialDevice';

export default class {
    constructor(device, onSampleCallback) {
        const instance = device.traits.jlink
            ? new RTTDevice(device)
            : new SerialDevice(device);
        instance.onSampleCallback = onSampleCallback;
        return instance;
    }
}
