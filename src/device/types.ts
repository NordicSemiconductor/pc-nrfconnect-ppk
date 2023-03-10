/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type RTTDevice from './rttDevice';
import type SerialDevice from './serialDevice';

export interface SampleValues {
    value?: number;
    bits?: number;
    endOfTrigger?: boolean;
}

// Should test the capabilities from either deviceInfo or a device instance to
// see if device is instance of RTTDevice
export function isRTTDevice(deviceToTest: any): deviceToTest is RTTDevice {
    return deviceToTest?.isRTTDevice;
}

export function isSerialDevice(
    deviceToTest: any
): deviceToTest is SerialDevice {
    return !isRTTDevice(deviceToTest);
}

export type SupportedDevice = RTTDevice | SerialDevice;

export interface serialport {
    comName: string;
    manufacturer: string;
    path: string;
    productId: string;
    serialNumber: string;
}

export interface deviceTraits {
    broken: boolean;
    jlink: boolean;
    mcuBoot: boolean;
    nordicDfu: boolean;
    nordicUsb: boolean;
    seggerUsb: boolean;
    serialPorts: boolean;
    usb: boolean;
}

export interface PPK2 {
    id: number;
    boardVersion?: undefined;
    dfuTriggerInfo: any;
    dfuTriggerVersion: { semVer: string };
    favorite: boolean;
    nickname: string;
    serialNumber: string;
    serialPorts: serialport[];
    serialport: serialport;
    traits: deviceTraits;
    usb: {
        device: {
            address: number;
            busNumber: number;
            configList: any;
            descriptor: any;
        };
        manufacturer: string;
        product: string;
        serialNumber: string;
    };
}

export interface Modifiers {
    r: modifier;
    gs: modifier;
    gi: modifier;
    o: modifier;
    s: modifier;
    i: modifier;
    ug: modifier;
}
export type modifier = [number, number, number, number, number];
export type modifiers = {
    [Property in keyof Modifiers]: modifier;
};

export interface openingMessage {
    opening: string;
}

export interface startedMessage {
    started: string;
}

export interface bufferMessage {
    type: string;
    data: Array<number>;
}

export type serialDeviceMessage =
    | openingMessage
    | startedMessage
    | bufferMessage;

export interface Mask {
    pos: number;
    mask: number;
}
