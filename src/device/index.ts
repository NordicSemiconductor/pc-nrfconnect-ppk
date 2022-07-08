/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import RTTDevice from './rttDevice';
import SerialDevice from './serialDevice';
import { SampleValues } from './types';

// TODO: device: should not be SerialDevice or RTTDevice
//  Rather it should be deviceInfo for PPK1 or PPK2.
// TODO: Should test if device is neither PPK1 or PPK2 in order to never select
// unwanted devices, and therefore avoid programming DK's that are not supposed
// to be used in the app?
export default (
    device: any,
    onSampleCallback: (values: SampleValues) => void
) => {
    const instance = device.traits.jlink // isRTTDevice(device)
        ? new RTTDevice(device, onSampleCallback)
        : new SerialDevice(device, onSampleCallback);

    return instance;
};
