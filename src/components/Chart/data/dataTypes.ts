/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export type DigitalChannelsType = boolean[];
export type BitStateIndexType = 0 | 1 | 2 | 3;
export type BitNumberType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type TimestampType = number | undefined;
export type AmpereStateType = number | null | undefined;

export enum BitStateType {
    zero = -0.4,
    one = 0.4,
}

/**
 * Represents a given state for a given digital channel
 * @var {Timestamp} timestamp: the corresponding timestamp of the given bit state: x-value in the Chart.
 * @var {BitState} bitState: the state of the digital channel in the given time stamp: y-value in the Chart.
 */
export interface DigitalChannelState {
    x: TimestampType;
    y: BitStateType | undefined;
}

export interface DigitalChannelStates {
    mainLine: DigitalChannelState[];
    uncertaintyLine: DigitalChannelState[];
}

export interface AmpereState {
    x: TimestampType;
    y: AmpereStateType;
}

export function isBitStateIndexType(
    value: unknown
): value is BitStateIndexType {
    return (
        typeof value === 'number' &&
        (value === 0 || value === 1 || value === 2 || value === 3)
    );
}
