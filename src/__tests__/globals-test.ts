/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { DataManager, getSamplingTime, timestampToIndex } from '../globals';

beforeEach(() => {
    DataManager().reset();
});

describe('timestampToIndex', () => {
    it('should return zero if timestamps are zero', () => {
        expect(timestampToIndex(0)).toBe(0);
    });

    it('should return index equal to options.index if argument is options.timestamp', () => {
        expect(timestampToIndex(30 * 1e6)).toBe(30);
    });
});

describe('getSamplingTime', () => {
    it('from 1 samplesPerSecond should return 1 million', () => {
        expect(getSamplingTime(1)).toBe(1e6);
    });

    it('from 10 samplesPerSecond should return 100k', () => {
        expect(getSamplingTime(10)).toBe(1e5);
    });

    it('from 100 samplesPerSecond should return 10k', () => {
        expect(getSamplingTime(100)).toBe(1e4);
    });

    it('from 1k samplesPerSecond should return 1k', () => {
        expect(getSamplingTime(1e3)).toBe(1e3);
    });

    it('from 10k samplesPerSecond should return 100', () => {
        expect(getSamplingTime(1e4)).toBe(100);
    });

    it('from 100k samplesPerSecond should return 10', () => {
        expect(getSamplingTime(1e5)).toBe(10);
    });
});

describe('setSamplingRate', () => {
    it('to have correct values', () => {
        DataManager().setSamplingRate(1e3);

        expect(DataManager().getSamplesPerSecond()).toBe(1e3);
        expect(DataManager().getSamplingTime()).toBe(getSamplingTime(1e3));
    });
});
