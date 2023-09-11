/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import SerialDevice from '../../device/serialDevice';
import { indexToTimestamp } from '../../globals';
import { TDispatch } from '../../slices/thunk';
import { calculateWindowSize, processTriggerSample } from '../triggerActions';

const middlewares = [thunk];
const mockStore = configureMockStore<unknown, TDispatch>(middlewares);

const mockDevicePPK2 = {
    ppkTriggerStop: jest.fn(),
    capabilities: {
        prePostTriggering: true,
    },
} as unknown as SerialDevice;

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
    dataBuffer: new Float32Array(2000).fill(100),
    endOfTrigger: false,
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
        store.dispatch(processTriggerSample(15, mockDevicePPK2, samplingData));
        const expectedActions = [
            {
                type: 'trigger/setTriggerStartAction',
                payload: beginIndex,
            },
        ];
        expect(store.getActions()).toEqual(expectedActions);
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
                processTriggerSample(5, mockDevicePPK2, {
                    ...samplingData,
                    dataIndex: 499,
                    endOfTrigger: false,
                })
            );
            expect(store.getActions().length).toBe(0);
            store.dispatch(
                processTriggerSample(5, mockDevicePPK2, {
                    ...samplingData,
                    dataIndex: 500,
                    endOfTrigger: true,
                })
            );
            expect(store.getActions().length).toBe(2);
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

const getExpectedChartActionsPPK2 = (
    fromIndex: number,
    toIndex: number,
    shift = 0
) => {
    const from = indexToTimestamp(fromIndex - shift);
    const to = indexToTimestamp(toIndex - shift);
    return [
        {
            type: 'chart/chartTrigger',
            payload: {
                windowBegin: from,
                windowEnd: to,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                windowDuration: to! - from!,
            },
        },
        {
            type: 'trigger/completeTriggerAction',
            payload: fromIndex,
        },
    ];
};
