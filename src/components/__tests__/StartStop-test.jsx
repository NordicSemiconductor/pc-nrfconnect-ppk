/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
