/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { deviceOpenedAction, rttStartAction } from '../../slices/appSlice';
import { setDataLoggerState } from '../../slices/dataLoggerSlice';
import { render } from '../../utils/testUtils';
import StartStop from '../SidePanel/StartStop';

const dataLoggerStatePPK1 = {
    samplingTime: 10,
    maxFreqLog10: 5,
    sampleFreqLog10: 5,
    sampleFreq: 7700,
    durationSeconds: 300,
    range: { name: 'minutes', multiplier: 60, min: 1, max: 72 },
    maxBufferSize: 200,
};

const dataLoggerStatePPK2 = {
    maxFreqLog10: 5,
    sampleFreqLog10: 10,
    sampleFreq: 100_000,
    durationSeconds: 300,
    range: { name: 'minutes', multiplier: 60, min: 1, max: 72 },
    maxBufferSize: 200,
};

const initialStatePPK1Actions = [
    rttStartAction(),
    deviceOpenedAction({
        portName: 'testPort',
        capabilities: { ppkTriggerExtToggle: false },
    }),
    setDataLoggerState({ state: dataLoggerStatePPK1 }),
];

const initialStatePPK2Actions = [
    rttStartAction(),
    deviceOpenedAction({
        portName: 'testPort',
        capabilities: { ppkTriggerExtToggle: false },
    }),
    setDataLoggerState({ state: dataLoggerStatePPK2 }),
];

const ppk2Tooltip = 'Start sampling at 100 kHz';
const ppk1Tooltip = 'Start sampling at 7.7 kHz';

describe('StartStop', () => {
    it('start button should have correct tooltip for PPK2', () => {
        const screen = render(<StartStop />, initialStatePPK2Actions);

        const startButton = screen.getByText('Start');
        expect(startButton.textContent).toBe('Start');
        expect(startButton.title).toBe(ppk2Tooltip);
    });

    it('start button should have correct tooltip for PPK1', () => {
        const screen = render(<StartStop />, initialStatePPK1Actions);

        const startButton = screen.getByText('Start');
        expect(startButton.textContent).toBe('Start');
        expect(startButton.title).toBe(ppk1Tooltip);
    });
});
