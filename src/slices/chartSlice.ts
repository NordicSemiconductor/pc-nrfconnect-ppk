/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { DataManager, microSecondsPerSecond } from '../globals';
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
import { getSampleFrequency } from './dataLoggerSlice';
import { TAction } from './thunk';

export interface ChartState {
    liveMode: boolean;
    cursorBegin?: null | number;
    cursorEnd?: null | number;
    windowEnd: number;
    windowDuration: number;
    yMin?: null | number;
    yMax?: null | number;
    hasDigitalChannels: boolean;
    digitalChannels: booleanTupleOf8;
    digitalChannelsVisible: boolean;
    timestampsVisible: boolean;
    yAxisLock: boolean;
    yAxisLog: boolean;
    windowBeginLock: null | number;
    windowEndLock: null | number;
    showSettings: boolean;
    latestDataTimestamp: number;
}

const initialWindowDuration = 10 * microSecondsPerSecond;
const initialState = (): ChartState => ({
    liveMode: true,
    cursorBegin: null, // [microseconds]
    cursorEnd: null, // [microseconds]
    windowEnd: initialWindowDuration, // [microseconds]
    windowDuration: initialWindowDuration, // [microseconds]
    yMin: null,
    yMax: null,
    hasDigitalChannels: false,
    digitalChannels: getDigitalChannels(),
    digitalChannelsVisible: getDigitalChannelsVisible(),
    timestampsVisible: getTimestampsVisible(),
    yAxisLock: false,
    yAxisLog: false,
    windowBeginLock: null, // [microseconds]
    windowEndLock: null, // [microseconds]
    showSettings: false,
    latestDataTimestamp: 0,
});

export const MIN_WINDOW_DURATION = 5e7;
export const MAX_WINDOW_DURATION = 1.2e13;
const Y_MIN = 0;
const Y_MAX = 1200000000;

const chartSlice = createSlice({
    name: 'chart',
    initialState: initialState(),
    reducers: {
        resetChartTime: state => {
            state.latestDataTimestamp = 0;
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
            const end =
                action.payload.cursorEnd != null
                    ? Math.max(
                          0,
                          Math.min(
                              DataManager().getTimestamp(),
                              action.payload.cursorEnd
                          )
                      )
                    : null;
            const begin =
                action.payload.cursorBegin != null
                    ? Math.min(
                          Math.max(0, action.payload.cursorBegin),
                          DataManager().getTimestamp()
                      )
                    : null;

            state.cursorBegin = begin;
            state.cursorEnd = end;
        },
        chartWindow(
            state,
            action: PayloadAction<{
                windowEnd: number;
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

            let { windowEnd, windowDuration } = action.payload;
            let windowBegin = Math.max(0, windowEnd - windowDuration);

            const { yAxisLock, windowBeginLock, windowEndLock } = state;

            if (windowBeginLock !== null) {
                windowBegin = Math.max(windowBeginLock, windowBegin);
                windowEnd = windowBegin - (windowEndLock ?? 0);
                windowDuration = windowEnd - windowBegin;
            }

            if (windowEnd > DataManager().getTimestamp()) {
                windowEnd = Math.max(
                    windowDuration,
                    DataManager().getTimestamp()
                );
            }

            return {
                ...state,
                windowEnd,
                windowDuration,
                yMin: yMin == null || yAxisLock ? state.yMin : yMin,
                yMax: yMax == null || yAxisLock ? state.yMax : yMax,
            };
        },
        panWindow(state, { payload: windowCenter }: PayloadAction<number>) {
            const windowEnd = windowCenter + state.windowDuration / 2;

            if (Number.isNaN(windowEnd)) return;

            state.windowEnd = windowEnd;
            state.liveMode = windowEnd >= DataManager().getTimestamp();
        },
        chartTrigger(
            state,
            action: PayloadAction<{
                windowBegin: number;
                windowEnd: number;
                windowDuration: number;
            }>
        ) {
            const { windowBegin, windowEnd, windowDuration } = action.payload;

            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration,
                initialWindowDuration,
                windowBeginLock: windowBegin,
                windowEndLock: windowEnd,
            };
        },
        setChartState: state => {
            state.hasDigitalChannels = DataManager().hasBits();
        },
        updateHasDigitalChannels: state => {
            state.hasDigitalChannels = DataManager().hasBits();
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
        toggleYAxisLog: state => {
            state.yAxisLog = !state.yAxisLog;
        },
        chartWindowLockAction: state => {
            state.windowBeginLock = Math.max(
                0,
                state.windowEnd - state.windowDuration
            );
            state.windowEndLock = state.windowEnd;
        },
        chartWindowUnLockAction: state => {
            state.windowBeginLock = null;
            state.windowEndLock = null;
        },
        setShowSettings: (state, action: PayloadAction<boolean>) => {
            state.showSettings = action.payload;
        },
        setLatestDataTimestamp: (state, action: PayloadAction<number>) => {
            state.latestDataTimestamp = action.payload;
        },
        setLiveMode: (state, action: PayloadAction<boolean>) => {
            state.liveMode = action.payload;
        },
    },
});

const calculateDuration = (
    sampleFrequency: number,
    windowDuration: number
): number =>
    Math.min(
        MAX_WINDOW_DURATION / sampleFrequency,
        Math.max(MIN_WINDOW_DURATION / sampleFrequency, windowDuration)
    );

export const chartWindowAction =
    (
        windowEnd: number,
        windowDuration: number,
        yMin?: number | null,
        yMax?: number | null
    ): TAction =>
    (dispatch, getState) => {
        const sampleFreq = getSampleFrequency(getState());
        const duration = calculateDuration(sampleFreq, windowDuration);

        dispatch(
            chartWindow({
                windowEnd,
                windowDuration: duration,
                yMin,
                yMax,
            })
        );

        if (windowEnd >= DataManager().getTimestamp()) {
            dispatch(setLiveMode(true));
        }
    };

export const animationAction = (): TAction => (dispatch, getState) => {
    dispatch(setLatestDataTimestamp(DataManager().getTimestamp()));
    if (isLiveMode(getState())) {
        dispatch(scrollToEnd());
    }
};

export const resetCursor = () =>
    chartCursorAction({ cursorBegin: null, cursorEnd: null });

const scrollToEnd = (): TAction => (dispatch, getState) =>
    dispatch(
        chartWindowAction(
            Math.max(
                DataManager().getTimestamp() -
                    getState().app.chart.windowDuration,
                getState().app.chart.windowDuration
            ),
            getWindowDuration(getState())
        )
    );

export const resetCursorAndChart = (): TAction => dispatch => {
    dispatch(scrollToEnd());
    dispatch(resetCursor());
};

export const getWindowDuration = (state: RootState) =>
    state.app.chart.windowDuration;
export const showChartSettings = (state: RootState) =>
    state.app.chart.showSettings;
export const getChartXAxisRange = (state: RootState) => {
    const windowEnd = Math.max(
        state.app.chart.liveMode
            ? DataManager().getTimestamp()
            : state.app.chart.windowEnd,
        state.app.chart.windowDuration
    );

    const windowDuration = state.app.chart.windowDuration;
    const windowBegin = Math.max(0, windowEnd - windowDuration);

    return {
        xAxisMax: state.app.chart.latestDataTimestamp,
        windowEnd,
        windowBegin,
        windowDuration,
        windowBeginLock: state.app.chart.windowBeginLock,
        windowEndLock: state.app.chart.windowEndLock,
    };
};
export const getChartYAxisRange = (state: RootState) => {
    let yMin = state.app.chart.yMin;
    if (state.app.chart.yMin == null) {
        yMin =
            state.app.chart.latestDataTimestamp === 0
                ? 0
                : state.app.chart.yMin;
    }
    return {
        yMax: state.app.chart.yMax,
        yMin,
        yAxisLog: state.app.chart.yAxisLog,
        yAxisLock: state.app.chart.yAxisLock,
    };
};

export const getCursorRange = (state: RootState) => ({
    cursorBegin: state.app.chart.cursorBegin,
    cursorEnd: state.app.chart.cursorEnd,
});

export const getChartDigitalChannelInfo = (state: RootState) => ({
    digitalChannels: state.app.chart.digitalChannels,
    digitalChannelsVisible: state.app.chart.digitalChannelsVisible,
    hasDigitalChannels: state.app.chart.hasDigitalChannels,
});

export const isLiveMode = (state: RootState) =>
    state.app.chart.liveMode && state.app.app.samplingRunning;
export const isTimestampsVisible = (state: RootState) =>
    state.app.chart.timestampsVisible;
export const isSessionActive = (state: RootState) =>
    state.app.chart.latestDataTimestamp !== 0;

export const {
    setLatestDataTimestamp,
    panWindow,
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
    toggleYAxisLog,
    updateHasDigitalChannels,
    setShowSettings,
    setLiveMode,
    resetChartTime,
} = chartSlice.actions;

export default chartSlice.reducer;
