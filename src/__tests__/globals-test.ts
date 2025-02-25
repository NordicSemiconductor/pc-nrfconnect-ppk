/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { DataManager, timestampToIndex } from '../globals';

jest.mock('../features/recovery/SessionsListFileHandler', () => ({
    ReadSessions: jest.fn(() => []),
}));

beforeEach(() => {
    DataManager().reset();
});

describe('timestampToIndex', () => {
    it('should return zero if timestamps are zero', () => {
        expect(timestampToIndex(0)).toBe(0);
    });

    it('should return index equal to options.index if argument is options.timestamp', () => {
        DataManager().setSamplesPerSecond(1);
        expect(timestampToIndex(30 * 1e6)).toBe(30);
    });
});
