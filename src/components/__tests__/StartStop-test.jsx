/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { render, screen } from '../../utils/testUtils';
import StartStop from '../SidePanel/StartStop';

const initialStatePpk2 = {
    app: {
        app: {
            rttRunning: true,
            samplingRunning: false,
            capabilities: {
                ppkTriggerSet: true,
            },
        },
        dataLogger: {
            sampleFreqLog10: 5,
            sampleFreq: 100000,
            durationSeconds: 300,
            maxFreqLog10: 5,
            samplesPerAverage: null,
            range: { name: 'minutes', multiplier: 60, min: 1, max: 72 },
        },
    },
};

const initialStatePpk1 = {
    app: {
        app: {
            rttRunning: true,
            samplingRunning: false,
            capabilities: {
                ppkTriggerSet: true,
            },
        },
        dataLogger: {
            sampleFreqLog10: 5,
            sampleFreq: 7700,
            durationSeconds: 300,
            maxFreqLog10: 5,
            samplesPerAverage: null,
            range: { name: 'minutes', multiplier: 60, min: 1, max: 72 },
        },
    },
};

const ppk2Tooltip = 'Start sampling at 100 kHz';
const ppk1Tooltip = 'Start sampling at 7.7 kHz';

describe('StartStop', () => {
    describe('ppk2', () => {
        beforeEach(() => {
            render(<StartStop />, {
                initialState: initialStatePpk2,
            });
        });

        it('start button should have correct tooltip for PPK2', () => {
            const startButton = screen.getByRole('button');
            expect(startButton.textContent).toBe('Start');
            expect(startButton.title).toBe(ppk2Tooltip);
        });
    });

    describe('ppk1', () => {
        beforeEach(() => {
            render(<StartStop />, {
                initialState: initialStatePpk1,
            });
        });

        it('start button should have correct tooltip for PPK1', () => {
            const startButton = screen.getByRole('button');
            expect(startButton.textContent).toBe('Start');
            expect(startButton.title).toBe(ppk1Tooltip);
        });
    });
});
