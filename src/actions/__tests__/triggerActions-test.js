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

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const mockDevicePPK1 = {
    ppkTriggerStop: jest.fn(),
    capabilities: {
        prePostTriggering: false,
    },
};

const mockDevicePPK2 = {
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
        dataLogger: {
            sampleFreq: 100000,
            maxSampleFreq: 100000,
        },
    },
    appLayout: {
        currentPane: 0,
    },
};
const beginIndex = 5;
const samplingData = {
    dataIndex: beginIndex,
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
        store.dispatch(processTriggerSample(15, mockDevicePPK1, samplingData));
        const expectedActions = [
            { type: 'SET_TRIGGER_START', triggerStartIndex: beginIndex },
        ];
        expect(store.getActions()).toEqual(expectedActions);
    });

    it('should chart window if enough samples have been processed', () => {
        const newIndex = 1005;
        const store = mockStore({
            ...initialState,
            app: {
                ...initialState.app,
                trigger: {
                    ...initialState.app.trigger,
                    triggerStartIndex: beginIndex,
                },
            },
        });
        store.dispatch(
            processTriggerSample(5, mockDevicePPK1, {
                ...samplingData,
                dataIndex: newIndex,
                endOfTrigger: true,
            })
        );
        expect(store.getActions()).toEqual(
            getExpectedChartActionsPPK1(beginIndex, newIndex)
        );
    });

    describe('Single trigger', () => {
        const newIndex = 1005;
        const store = mockStore({
            ...initialState,
            app: {
                ...initialState.app,
                trigger: {
                    ...initialState.app.trigger,
                    triggerStartIndex: beginIndex,
                    triggerSingleWaiting: true,
                },
            },
        });

        it('should reset single trigger and issue device stop samping command', () => {
            store.dispatch(
                processTriggerSample(5, mockDevicePPK1, {
                    ...samplingData,
                    dataIndex: newIndex,
                    endOfTrigger: true,
                })
            );
            expect(store.getActions()).toEqual([
                {
                    type: 'TRIGGER_SINGLE_CLEAR',
                },
                ...getExpectedChartActionsPPK1(beginIndex, newIndex),
            ]);
            expect(mockDevicePPK1.ppkTriggerStop).toHaveBeenCalledTimes(1);
        });
    });

    describe('Buffer functionality', () => {
        const store = mockStore({
            ...initialState,
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
                processTriggerSample(5, mockDevicePPK1, {
                    ...samplingData,
                    dataIndex: 499,
                    endOfTrigger: false,
                })
            );
            expect(store.getActions().length).toBe(0);
            store.dispatch(
                processTriggerSample(5, mockDevicePPK1, {
                    ...samplingData,
                    dataIndex: 500,
                    endOfTrigger: true,
                })
            );
            expect(store.getActions().length).toBe(
                getExpectedChartActionsPPK1(null, null).length
            );
        });
    });

    describe('Window offset', () => {
        const endIndex = beginIndex + 1000;
        const windowSize = calculateWindowSize(
            defaultTriggerLength,
            samplingData.samplingTime
        );

        it('should by default shift window by half the window size for given hw', () => {
            const store = mockStore({
                ...initialState,
                app: {
                    ...initialState.app,
                    trigger: {
                        ...initialState.app.trigger,
                        triggerStartIndex: beginIndex,
                    },
                },
            });
            store.dispatch(
                processTriggerSample(5, mockDevicePPK2, {
                    ...samplingData,
                    dataIndex: endIndex,
                })
            );
            const expectedShiftedIndex = windowSize / 2;
            expect(expectedShiftedIndex).toBe(500);
            expect(store.getActions()).toEqual(
                getExpectedChartActionsPPK2(
                    beginIndex,
                    endIndex,
                    expectedShiftedIndex
                )
            );
        });

        it('should shift window according to given offset', () => {
            const triggerWindowOffset = 500;
            const store = mockStore({
                ...initialState,
                app: {
                    ...initialState.app,
                    trigger: {
                        ...initialState.app.trigger,
                        triggerStartIndex: beginIndex,
                        triggerWindowOffset,
                    },
                },
            });
            store.dispatch(
                processTriggerSample(5, mockDevicePPK2, {
                    ...samplingData,
                    dataIndex: endIndex,
                })
            );

            // triggerWindowOffset = 500 translates to 50 samples offset with a samplingTime of 10
            // Currently the implementation is such that triggerWindowOffset === -windowSize / 2
            // shifts the window all the way to the left, while triggerWindowOffset === windowSize / 2
            // shifts the window all the way to the right.
            //
            // For PPK2, default trigger position inside window should be center, e.g. it will be shifted
            // by half the size of the window plus the given offset.
            const shift = triggerWindowOffset / samplingData.samplingTime;
            const expectedShiftedIndex = windowSize / 2 + shift;
            expect(shift).toBe(50);
            expect(expectedShiftedIndex).toBe(550);
            expect(store.getActions()).toEqual(
                getExpectedChartActionsPPK2(
                    beginIndex,
                    endIndex,
                    expectedShiftedIndex
                )
            );
        });
    });
});

const getExpectedChartActionsPPK2 = (fromIndex, toIndex, shift = 0) => {
    const from = indexToTimestamp(fromIndex - shift);
    const to = indexToTimestamp(toIndex - shift);
    return [
        { type: 'CHART_WINDOW_UNLOCK' },
        {
            type: 'CHART_WINDOW',
            windowBegin: from,
            windowEnd: to,
            windowDuration: to - from,
            yMax: undefined,
            yMin: undefined,
        },
        { type: 'CHART_WINDOW_LOCK' },
        { type: 'SET_TRIGGER_ORIGIN', origin: fromIndex },
        { type: 'SET_TRIGGER_START', triggerStartIndex: null },
    ];
};

const getExpectedChartActionsPPK1 = (fromIndex, toIndex) => {
    const from = indexToTimestamp(fromIndex);
    const to = indexToTimestamp(toIndex);
    return [
        { type: 'CHART_WINDOW_UNLOCK' },
        {
            type: 'CHART_WINDOW',
            windowBegin: from,
            windowEnd: to,
            windowDuration: to - from,
            yMax: undefined,
            yMin: undefined,
        },
        { type: 'CHART_WINDOW_LOCK' },
        { type: 'SET_TRIGGER_START', triggerStartIndex: null },
    ];
};
