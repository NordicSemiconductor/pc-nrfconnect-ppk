/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    BitStateIndexType,
    BitStateType,
} from '../components/Chart/data/dataTypes';

/* eslint-disable no-bitwise */

/**
 * @param {number} b8 8-bit input
 * @returns {number} 16-bit value of bit pairs
 * - convertBits16(0b00000000) => 0b0101010101010101
 * - convertBits16(0b11111111) => 0b1010101010101010
 * - (convertBits16(0b00000000) | convertBits16(0b11111111)) => 0b1111111111111111
 */
export const convertBits16 = (b8: number): number =>
    (((b8 & 128) + 128) << 7) |
    (((b8 & 64) + 64) << 6) |
    (((b8 & 32) + 32) << 5) |
    (((b8 & 16) + 16) << 4) |
    (((b8 & 8) + 8) << 3) |
    (((b8 & 4) + 4) << 2) |
    (((b8 & 2) + 2) << 1) |
    ((b8 & 1) + 1);

/**
 * Extract out of a 16 bit value the averaged bit state.
 * There are 3 valid states as described in the return value.
 *
 * @param {number} b16 16-bit input of 8 bit-pairs
 * @param {number} n index of bit-pair
 * @returns {number}
 * - 0 (b00): invalid (undefined)
 * - 1 (b01): was always 0
 * - 2 (b10): was always 1
 * - 3 (b11): was sometimes 0 and sometimes 1
 */
export const averagedBitState = (b16: number, n: number): BitStateIndexType =>
    (3 & (b16 >> (n + n))) as BitStateIndexType;

export const always0: BitStateIndexType = 1;
export const always1: BitStateIndexType = 2;
export const sometimes0And1: BitStateIndexType = 3;

export interface LineDataBitState {
    mainLine: BitStateType | undefined;
    uncertaintyLine: BitStateType | undefined;
}

export const lineDataForBitState: LineDataBitState[] = [
    /* 0: invalid */ {
        mainLine: undefined,
        uncertaintyLine: undefined,
    },
    /* 1: always 0 */ {
        mainLine: BitStateType.zero,
        uncertaintyLine: BitStateType.zero,
    },
    /* 2: always 1 */ {
        mainLine: BitStateType.one,
        uncertaintyLine: BitStateType.one,
    },
    /* sometimes 0 and sometimes 1 */ {
        mainLine: BitStateType.zero,
        uncertaintyLine: BitStateType.one,
    },
];
