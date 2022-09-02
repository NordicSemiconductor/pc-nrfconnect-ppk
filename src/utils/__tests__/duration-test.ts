/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { formatDuration } from '../duration';

describe('formatData', () => {
    it('should convert duration', () => {
        expect(formatDuration(1)).toMatch('1\u00B5s');
        expect(formatDuration(12)).toMatch('12\u00B5s');
        expect(formatDuration(123)).toMatch('123\u00B5s');
        expect(formatDuration(1234)).toMatch('1.234ms');
        expect(formatDuration(12345)).toMatch('12.34ms');
        expect(formatDuration(123456)).toMatch('123.4ms');
        expect(formatDuration(1234567)).toMatch('1.234s');
        expect(formatDuration(12345678)).toMatch('12.34s');
        expect(formatDuration(123456789)).toMatch('2:03.4m');
        expect(formatDuration(1234567890)).toMatch('20:34m');
        expect(formatDuration(12345678901)).toMatch('3:25:45h');
        expect(formatDuration(123456789012)).toMatch('1d 10:17h');
        expect(formatDuration(1214567890123)).toMatch('14d 1:22h');
    });
});
