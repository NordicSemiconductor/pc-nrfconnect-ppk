/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- temporarily added to be conservative while converting to typescript */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { options } from '../globals';
import {
    booleanTupleOf8,
    getDigitalChannels,
    getDigitalChannelsVisible,
    getTimestampsVisible,
    setDigitalChannels as persistDigitalChannels,
    setDigitalChannelsVisible as persistDigitalChannelsVisible,
    setTimestampsVisible as persistTimestampsVisible,
} from '../utils/persistentStore';
import type { RootState } from '.';
import { getMaxSampleFrequency, getSampleFrequency } from './dataLoggerSlice';
import { TAction } from './thunk';

interface ChartState {
    cursorBegin?: null | number;
    cursorEnd?: null | number;
    windowBegin: null | number;
    windowEnd: null | number;
    windowDuration: number;
    yMin?: null | number;
    yMax?: null | number;
    bufferLength: number;
    bufferRemaining: number;
    index: number;
    hasDigitalChannels: boolean;
    digitalChannels: booleanTupleOf8;
    digitalChannelsVisible: boolean;
    timestampsVisible: boolean;
    yAxisLock: boolean;
    windowBeginLock: null | number;
    windowEndLock: null | number;
}

const initialWindowDuration = 7 * 1e6;
const initialBufferLength =
    (options.data.length / options.samplesPerSecond) * 1e6 -
    initialWindowDuration;
const initialState = (): ChartState => ({
    cursorBegin: null, // [microseconds]
    cursorEnd: null, // [microseconds]
    windowBegin: 0, // [microseconds]
    windowEnd: 0, // [microseconds]
    windowDuration: initialWindowDuration, // [microseconds]
    yMin: null,
    yMax: null,
    bufferLength: initialBufferLength,
    bufferRemaining: initialBufferLength,
    index: 0,
    hasDigitalChannels: false,
    digitalChannels: getDigitalChannels(),
    digitalChannelsVisible: getDigitalChannelsVisible(),
    timestampsVisible: getTimestampsVisible(),
    yAxisLock: false,
    windowBeginLock: null, // [microseconds]
    windowEndLock: null, // [microseconds]
});

const MIN_WINDOW_DURATION = 5e7;
const MAX_WINDOW_DURATION = 1.2e13;
const Y_MIN = -100;
const Y_MAX = 1200000;

const chartSlice = createSlice({
    name: 'chart',
    initialState: initialState(),
    reducers: {
        animationAction(state) {
            const { windowDuration, windowEnd } = state;
            const { bufferLength, bufferRemaining } = calcBuffer(
                windowDuration,
                windowEnd!
            );
            if (windowEnd === 0) {
                return {
                    ...state,
                    bufferLength,
                    bufferRemaining,
                    index: options.index,
                };
            }
            return {
                ...state,
                bufferRemaining,
            };
        },
        setYMax: (state, action: PayloadAction<{ yMax: number }>) => {
            state.yMax = action.payload.yMax;
        },
        setYMin: (state, action: PayloadAction<{ yMin: number }>) => {
            state.yMin = action.payload.yMin;
        },
        chartCursorAction: (
            state,
            action: PayloadAction<{
                cursorBegin: null | number;
                cursorEnd: null | number;
            }>
        ) => {
            state.cursorBegin = action.payload.cursorBegin;
            state.cursorEnd = action.payload.cursorEnd;
        },
        chartWindow(
            state,
            action: PayloadAction<{
                windowBegin: null | number;
                windowEnd: null | number;
                windowDuration: number;
                yMin?: null | number;
                yMax?: null | number;
            }>
        ) {
            let { yMin, yMax } = action.payload;

            if (yMin != null && yMax != null) {
                const p0 = Math.max(0, Y_MIN - yMin);
                const p1 = Math.max(0, yMax - Y_MAX);
                if (p0 * p1 === 0) {
                    yMin = yMin - p1 + p0;
                    yMax = yMax - p1 + p0;
                } else {
                    yMin = Y_MIN;
                    yMax = Y_MAX;
                }
            }

            let { windowBegin, windowEnd, windowDuration } = action.payload;
            if (windowBegin === null && windowEnd === null) {
                windowBegin = 0;
                windowEnd = 0;
            } else {
                const [half, center] = getCenter(
                    windowBegin!,
                    windowEnd!,
                    windowDuration
                );
                windowBegin = center - half;
                windowEnd = center + half;
            }

            const { yAxisLock, windowBeginLock, windowEndLock } = state;

            if (windowBeginLock !== null) {
                windowBegin = Math.max(windowBeginLock, windowBegin);
                windowEnd =
                    windowEnd === 0
                        ? windowEndLock
                        : Math.min(windowEndLock!, windowEnd);
                windowDuration = windowEnd! - windowBegin;
            }

            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration,
                ...calcBuffer(windowDuration, windowEnd!),
                yMin: yMin == null || yAxisLock ? state.yMin : yMin,
                yMax: yMax == null || yAxisLock ? state.yMax : yMax,
            };
        },
        chartTrigger(
            state,
            action: PayloadAction<{
                windowBegin: number;
                windowEnd: number;
                windowDuration: number;
            }>
        ) {
            const [half, center] = getCenter(
                action.payload.windowBegin,
                action.payload.windowEnd,
                action.payload.windowDuration
            );

            const windowBegin = center - half;
            const windowEnd = center + half;

            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration: action.payload.windowDuration,
                initialWindowDuration,
                windowBeginLock: windowBegin,
                windowEndLock: windowEnd,
                ...calcBuffer(action.payload.windowDuration, windowEnd),
            };
        },
        setChartState: state => {
            state.hasDigitalChannels = options.bits !== null;
        },
        updateHasDigitalChannels: state => {
            state.hasDigitalChannels = options.bits !== null;
        },
        setDigitalChannels(
            state,
            action: PayloadAction<{ digitalChannels: booleanTupleOf8 }>
        ) {
            const { digitalChannels } = action.payload;
            persistDigitalChannels(digitalChannels);
            return { ...state, digitalChannels };
        },
        toggleDigitalChannels: state => {
            const newVisibilityValue = !state.digitalChannelsVisible;
            persistDigitalChannelsVisible(newVisibilityValue);
            state.digitalChannelsVisible = newVisibilityValue;
        },
        toggleTimestamps: state => {
            const newVisibilityValue = !state.timestampsVisible;
            persistTimestampsVisible(newVisibilityValue);
            state.timestampsVisible = newVisibilityValue;
        },
        toggleYAxisLock(
            state,
            action: PayloadAction<{ yMin: number | null; yMax: number | null }>
        ) {
            return {
                ...state,
                yAxisLock: !state.yAxisLock,
                yMin: action.payload?.yMin || null,
                yMax: action.payload?.yMax || null,
            };
        },
        chartWindowLockAction: state => {
            state.windowBeginLock = state.windowBegin;
            state.windowEndLock = state.windowEnd;
        },
        chartWindowUnLockAction: state => {
            state.windowBeginLock = null;
            state.windowEndLock = null;
        },
    },
});

const calculateDuration = (
    sampleFrequency: number,
    windowDuration: null | number
): number | null =>
    windowDuration === null
        ? null
        : Math.min(
              MAX_WINDOW_DURATION / sampleFrequency,
              Math.max(MIN_WINDOW_DURATION / sampleFrequency, windowDuration)
          );

const getCenter = (
    begin: number,
    end: number,
    duration: number
): [number, number] => [duration / 2, (begin + end) / 2];

export const chartWindowAction =
    (
        windowBegin: null | number,
        windowEnd: null | number,
        windowDuration: number,
        yMin?: number,
        yMax?: number
    ): TAction =>
    (dispatch, getState) => {
        const sampleFreq = getSampleFrequency(getState());
        const duration = calculateDuration(sampleFreq, windowDuration);

        dispatch(
            chartWindow({
                windowBegin,
                windowEnd,
                windowDuration: duration!,
                yMin,
                yMax,
            })
        );
    };

export const chartTriggerWindowAction =
    (windowBegin: number, windowEnd: number, windowDuration: number): TAction =>
    (dispatch, getState) => {
        const maxSampleFreq = getMaxSampleFrequency(getState());
        const duration = calculateDuration(maxSampleFreq, windowDuration);

        dispatch(
            chartTrigger({ windowBegin, windowEnd, windowDuration: duration! })
        );
    };

export const resetCursor = () =>
    chartCursorAction({ cursorBegin: null, cursorEnd: null });

export const resetChart = (): TAction => (dispatch, getState) =>
    dispatch(chartWindowAction(null, null, getWindowDuration(getState())));

export const resetCursorAndChart = (): TAction => (dispatch, getState) => {
    dispatch(chartWindowAction(null, null, getWindowDuration(getState())));
    dispatch(resetCursor());
};

function calcBuffer(windowDuration: number, windowEnd: number) {
    const { data, samplesPerSecond, timestamp } = options;
    const totalInUs = (data.length / samplesPerSecond) * 1e6;
    const bufferLength = totalInUs - windowDuration;
    const bufferRemaining =
        windowEnd !== 0
            ? bufferLength - (timestamp! - windowEnd)
            : bufferLength;
    return {
        bufferLength,
        bufferRemaining,
    };
}

export const chartState = (state: RootState) => state.app.chart;
export const getWindowDuration = (state: RootState) =>
    state.app.chart.windowDuration;

export const {
    animationAction,
    chartCursorAction,
    chartTrigger,
    chartWindow,
    chartWindowLockAction,
    chartWindowUnLockAction,
    setChartState,
    setDigitalChannels,
    setYMin,
    setYMax,
    toggleDigitalChannels,
    toggleTimestamps,
    toggleYAxisLock,
    updateHasDigitalChannels,
} = chartSlice.actions;

export default chartSlice.reducer;
