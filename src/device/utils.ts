/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
import RTTDevice from './rttDevice';
import SerialDevice from './serialDevice';

export function isRTTDevice(
    device: null | RTTDevice | SerialDevice
): device is RTTDevice {
    return device != null && device instanceof RTTDevice;
}

export function isSerialDevice(
    device: null | RTTDevice | SerialDevice
): device is SerialDevice {
    return device != null && !isRTTDevice(device);
}
