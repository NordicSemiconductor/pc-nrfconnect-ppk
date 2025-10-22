/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export type DigitalChannelsType = boolean[];
export type BitNumberType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type TimestampType = number | undefined;
export type AmpereStateType = number | null | undefined;

export type BitState =
    | 0b00 //  = 0: invalid (undefined)
    | 0b01 //  = 1: was always 0
    | 0b10 //  = 2: was always 1
    | 0b11; // = 3: was sometimes 0 and sometimes 1

export enum ChartLineValue {
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
    y: ChartLineValue | undefined;
}

export interface DigitalChannelStates {
    mainLine: DigitalChannelState[];
    uncertaintyLine: DigitalChannelState[];
}

export interface AmpereState {
    x: TimestampType;
    y: AmpereStateType;
}
