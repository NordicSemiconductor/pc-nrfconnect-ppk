/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { formatDataForExport } from '../exportChartAction';

const buffer = [7, 8, 9, 10];
const bitsData = [0xaaaa, 0x5555, 0x6566];
const startingPoint = 2;

jest.mock('../../features/recovery/SessionsListFileHandler', () => ({
    ReadSessions: jest.fn(() => []),
    WriteSessions: jest.fn(),
}));

// There seems to be a discrepancy between the length parameter
// (in this example we have a length of 2, but the resulting string has 3 samples)
// and the actual number of samples we get. However, the solution as a whole seems
// to work, so I'm leaving it for now
describe('formatData', () => {
    it('should contain only current values', () => {
        // selection [timestamp, current, bits, bitsSeperated]
        const selection = [false, true, false, false];
        const content = formatDataForExport(
            startingPoint,
            buffer,
            bitsData,
            selection
        );
        // Test that we only get current
        expect(content).toMatch(/^7\.000\s/);
        expect(content).toMatch(/\s8\.000\s/);
        expect(content).toMatch(/\s9\.000\s/);
    });

    it('should contain only timestamp and current values', () => {
        // selection [timestamp, current, bits, bitsSeperated]
        const selection = [true, true, false, false];
        const content = formatDataForExport(
            startingPoint,
            buffer,
            bitsData,
            selection
        );
        // Test that we only get timestamp and current
        expect(content).toMatch(/0\.02,7\.000\s/);
        expect(content).toMatch(/0\.03,8\.000\s/);
        expect(content).toMatch(/0\.04,9\.000\s/);
    });

    it('should contain all data', () => {
        // selection [timestamp, current, bits, bitsSeperated]
        const selection = [true, true, true, true];
        const content = formatDataForExport(
            startingPoint,
            buffer,
            bitsData,
            selection
        );
        // Test that we only get timestamp and current
        expect(content).toMatch(/0\.02,7\.000,11111111,1,1,1,1,1,1,1,1/);
        expect(content).toMatch(/0\.03,8\.000,00000000,0,0,0,0,0,0,0,0\s/);
        expect(content).toMatch(/0\.04,9\.000,10100010,1,0,1,0,0,0,1,0\s/);
    });
});
