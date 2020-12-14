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

import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { processTriggerSample, calculateWindowSize } from '../triggerActions';
import { indexToTimestamp } from '../../globals';

jest.mock('nrfconnect/core', () => {
    return {
        logger: {
            info: jest.fn(),
        },
    };
});

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const mockPpk2Device = {
    numberOfSamplesIn5Ms: 500,
    ppkTriggerStop: jest.fn(),
    capabilities: {
        prePostTriggering: true,
    },
};

const defaultTriggerLength = 10;
const defaultTriggerLevel = 10;
const initialState = {
    app: {
        trigger: {
            triggerLength: defaultTriggerLength,
            triggerLevel: defaultTriggerLevel,
            triggerSingleWaiting: false,
            triggerStartIndex: null,
            triggerWindowOffset: 0,
        },
    },
};
const initialIndex = 5;
const samplingData = {
    dataIndex: initialIndex,
    samplingTime: 10,
    dataBuffer: new Array(2000).fill(100),
};

describe('Handle trigger', () => {
    describe('window sizes', () => {
        it('should calculate window size', () => {
            const windowSize = calculateWindowSize(
                defaultTriggerLength,
                samplingData.samplingTime
            );
            expect(windowSize).toBe(1000);
        });
    });

    it('should set triggerStart if value is higher than trigger level', () => {
        const store = mockStore(initialState);
        store.dispatch(processTriggerSample(15, mockPpk2Device, samplingData));
        const expectedActions = [
            { type: 'SET_TRIGGER_START', triggerStartIndex: initialIndex },
        ];
        expect(store.getActions()).toEqual(expectedActions);
    });

    it('should chart window if enough samples have been processed', () => {
        const newIndex = 1005;
        const store = mockStore({
            app: {
                ...initialState.app,
                trigger: {
                    ...initialState.app.trigger,
                    triggerStartIndex: initialIndex,
                },
            },
        });
        store.dispatch(
            processTriggerSample(5, mockPpk2Device, {
                ...samplingData,
                dataIndex: newIndex,
            })
        );
        const from = indexToTimestamp(initialIndex);
        const to = indexToTimestamp(newIndex);
        const expectedActions = [
            {
                type: 'CHART_WINDOW',
                windowBegin: from,
                windowEnd: to,
                windowDuration: to - from,
                yMax: undefined,
                yMin: undefined,
            },
            { type: 'SET_TRIGGER_START', triggerStartIndex: null },
        ];
        expect(store.getActions()).toEqual(expectedActions);
    });

    describe('Single trigger', () => {
        const newIndex = 1005;
        const store = mockStore({
            app: {
                ...initialState.app,
                trigger: {
                    ...initialState.app.trigger,
                    triggerStartIndex: initialIndex,
                    triggerSingleWaiting: true,
                },
            },
        });

        it('should reset single trigger and issue device stop samping command', () => {
            store.dispatch(
                processTriggerSample(5, mockPpk2Device, {
                    ...samplingData,
                    dataIndex: newIndex,
                })
            );
            const from = indexToTimestamp(initialIndex);
            const to = indexToTimestamp(newIndex);
            const expectedActions = [
                {
                    type: 'TRIGGER_SINGLE_CLEAR',
                },
                {
                    type: 'CHART_WINDOW',
                    windowBegin: from,
                    windowEnd: to,
                    windowDuration: to - from,
                    yMax: undefined,
                    yMin: undefined,
                },
                { type: 'SET_TRIGGER_START', triggerStartIndex: null },
            ];
            expect(store.getActions()).toEqual(expectedActions);
            expect(mockPpk2Device.ppkTriggerStop).toHaveBeenCalledTimes(1);
        });
    });

    describe('Buffer functionality', () => {
        const store = mockStore({
            app: {
                ...initialState.app,
                trigger: {
                    ...initialState.app.trigger,
                    triggerStartIndex: 1500,
                },
            },
        });

        it('Should handle the buffer wrapping around', () => {
            // window size here will be 1000, so it should start drawing at index 500
            store.dispatch(
                processTriggerSample(5, mockPpk2Device, {
                    ...samplingData,
                    dataIndex: 499,
                })
            );
            expect(store.getActions().length).toBe(0);
            store.dispatch(
                processTriggerSample(5, mockPpk2Device, {
                    ...samplingData,
                    dataIndex: 500,
                })
            );
            expect(store.getActions().length).toBe(2);
        });
    });
});
