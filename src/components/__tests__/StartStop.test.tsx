/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { deviceOpenedAction } from '../../slices/appSlice';
import {
    DataLoggerState,
    setDataLoggerState,
} from '../../slices/dataLoggerSlice';
import { render, screen } from '../../utils/testUtils';
import StartStop from '../SidePanel/StartStop';

const dataLoggerStatePPK2 = {
    maxFreqLog10: 5,
    sampleFreqLog10: 10,
    sampleFreq: 100_000,
    duration: 300,
    durationUnit: 's',
} as DataLoggerState;

const initialStatePPK2Actions = [
    deviceOpenedAction({
        portName: 'testPort',
        capabilities: { ppkTriggerExtToggle: false },
    }),
    setDataLoggerState({ state: dataLoggerStatePPK2 }),
];

const ppk2Tooltip = 'Start sampling at 100 kHz';

describe('StartStop', () => {
    it('start button should have correct tooltip for PPK2', () => {
        render(<StartStop />, initialStatePPK2Actions);

        const startButton = screen.getByText('Start');
        expect(startButton.textContent).toBe('Start');
        expect(startButton.title).toBe(ppk2Tooltip);
    });
});
