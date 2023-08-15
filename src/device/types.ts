/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SampleValues {
    value?: number;
    bits?: number;
    endOfTrigger?: boolean;
}

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
