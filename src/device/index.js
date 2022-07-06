/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import RTTDevice from './rttDevice';
import SerialDevice from './serialDevice';

export default (device, onSampleCallback) => {
    const instance = device.traits.jlink
        ? new RTTDevice(device, onSampleCallback)
        : new SerialDevice(device, onSampleCallback);
    return instance;
};
