/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { options } from '../globals';
import {
    getDigitalChannels,
    getDigitalChannelsVisible,
    getTimestampsVisible,
    setDigitalChannels as persistDigitalChannels,
    setDigitalChannelsVisible as persistDigitalChannelsVisible,
    setTimestampsVisible as persistTimestampsVisible,
} from '../utils/persistentStore';

const initialWindowDuration = 7 * 1e6;
const initialBufferLength =
    (options.data.length / options.samplesPerSecond) * 1e6 -
    initialWindowDuration;
const initialState = () => ({
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

const ANIMATION = 'ANIMATION';
const CHART_CURSOR = 'CHART_CURSOR';
const CHART_WINDOW = 'CHART_WINDOW';
const CHART_TRIGGER_WINDOW = 'CHART_TRIGGER_WINDOW';
const LOAD_CHART_STATE = 'LOAD_CHART_STATE';
const DIGITAL_CHANNELS = 'DIGITAL_CHANNELS';
const TOGGLE_DIGITAL_CHANNELS = 'TOGGLE_DIGITAL_CHANNELS';
const TOGGLE_TIMESTAMPS = 'TOGGLE_TIMESTAMPS';
const UPDATE_HAS_DIGITAL_CHANNELS = 'UPDATE_HAS_DIGITAL_CHANNELS';
const TOGGLE_Y_AXIS_LOCK = 'TOGGLE_Y_AXIS_LOCK';
const CHART_WINDOW_LOCK = 'CHART_WINDOW_LOCK';
const CHART_WINDOW_UNLOCK = 'CHART_WINDOW_UNLOCK';

const MIN_WINDOW_DURATION = 5e7;
const MAX_WINDOW_DURATION = 1.2e13;
const Y_MIN = -100;
const Y_MAX = 1200000;

export const animationAction = () => ({ type: ANIMATION });

export const chartCursorAction = (cursorBegin, cursorEnd) => ({
    type: CHART_CURSOR,
    cursorBegin,
    cursorEnd,
});

const calculateDuration = (sampleFrequency, windowDuration) =>
    windowDuration === null
        ? null
        : Math.min(
              MAX_WINDOW_DURATION / sampleFrequency,
              Math.max(MIN_WINDOW_DURATION / sampleFrequency, windowDuration)
          );

const getCenter = (begin, end, duration) => [duration / 2, (begin + end) / 2];

const chartWindow = (windowBegin, windowEnd, windowDuration, yMin, yMax) => {
    let y0 = yMin;
    let y1 = yMax;

    if (yMin != null && yMax != null) {
        const p0 = Math.max(0, Y_MIN - yMin);
        const p1 = Math.max(0, yMax - Y_MAX);
        if (p0 * p1 === 0) {
            y0 = y0 - p1 + p0;
            y1 = y1 - p1 + p0;
        } else {
            y0 = Y_MIN;
            y1 = Y_MAX;
        }
    }

    if (windowBegin === null && windowEnd === null) {
        return {
            type: CHART_WINDOW,
            windowBegin: 0,
            windowEnd: 0,
            windowDuration,
            yMin: y0,
            yMax: y1,
        };
    }
    const [half, center] = getCenter(windowBegin, windowEnd, windowDuration);
    return {
        type: CHART_WINDOW,
        windowBegin: center - half,
        windowEnd: center + half,
        windowDuration,
        yMin: y0,
        yMax: y1,
    };
};

export const chartWindowAction =
    (windowBegin, windowEnd, windowDuration, yMin, yMax) =>
    (dispatch, getState) => {
        const { sampleFreq } = getState().app.dataLogger;
        const duration = calculateDuration(sampleFreq, windowDuration);

        dispatch(chartWindow(windowBegin, windowEnd, duration, yMin, yMax));
    };

const chartTrigger = (windowBegin, windowEnd, windowDuration) => {
    const [half, center] = getCenter(windowBegin, windowEnd, windowDuration);
    return {
        type: CHART_TRIGGER_WINDOW,
        windowBegin: center - half,
        windowEnd: center + half,
        windowDuration,
    };
};

export const chartTriggerWindowAction =
    (windowBegin, windowEnd, windowDuration) => (dispatch, getState) => {
        const { maxSampleFreq } = getState().app.dataLogger;
        const duration = calculateDuration(maxSampleFreq, windowDuration);

        dispatch(chartTrigger(windowBegin, windowEnd, duration));
    };

export const chartWindowLockAction = () => ({ type: CHART_WINDOW_LOCK });
export const chartWindowUnLockAction = () => ({ type: CHART_WINDOW_UNLOCK });

export const resetCursor = () => chartCursorAction(null, null);
export const resetCursorAndChart = () => (dispatch, getState) => {
    dispatch(
        chartWindowAction(null, null, getState().app.chart.windowDuration)
    );
    dispatch(resetCursor());
};

export const setChartState = state => ({
    type: LOAD_CHART_STATE,
    ...state,
    yMin: state.yAxisLock ? state.yMin : null,
    yMax: state.yAxisLock ? state.yMax : null,
    hasDigitalChannels: options.bits !== null,
});

export const updateHasDigitalChannels = () => ({
    type: UPDATE_HAS_DIGITAL_CHANNELS,
    hasDigitalChannels: options.bits !== null,
});

export const setDigitalChannels = digitalChannels => ({
    type: DIGITAL_CHANNELS,
    digitalChannels,
});

export const toggleDigitalChannels = () => ({ type: TOGGLE_DIGITAL_CHANNELS });
export const toggleTimestamps = () => ({ type: TOGGLE_TIMESTAMPS });
export const toggleYAxisLock = (yMin, yMax) => ({
    type: TOGGLE_Y_AXIS_LOCK,
    yMin,
    yMax,
});

function calcBuffer(windowDuration, windowEnd) {
    const { data, samplesPerSecond, timestamp } = options;
    const totalInUs = (data.length / samplesPerSecond) * 1e6;
    const bufferLength = totalInUs - windowDuration;
    const bufferRemaining =
        windowEnd !== 0 ? bufferLength - (timestamp - windowEnd) : bufferLength;
    return {
        bufferLength,
        bufferRemaining,
    };
}

export default (state = initialState(), { type, ...action }) => {
    switch (type) {
        case CHART_CURSOR: {
            const { cursorBegin, cursorEnd } = action;
            return {
                ...state,
                cursorBegin,
                cursorEnd,
            };
        }
        case CHART_WINDOW: {
            let { windowBegin, windowEnd, windowDuration } = action;
            const { yMin, yMax } = action;
            const { yAxisLock, windowBeginLock, windowEndLock } = state;
            if (windowBeginLock !== null) {
                windowBegin = Math.max(windowBeginLock, windowBegin);
                windowEnd =
                    windowEnd === 0
                        ? windowEndLock
                        : Math.min(windowEndLock, windowEnd);
                windowDuration = windowEnd - windowBegin;
            }
            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration,
                ...calcBuffer(windowDuration, windowEnd),
                yMin: yMin === null || yAxisLock ? state.yMin : yMin,
                yMax: yMax === null || yAxisLock ? state.yMax : yMax,
            };
        }
        case CHART_TRIGGER_WINDOW: {
            const { windowBegin, windowEnd, windowDuration } = action;
            const { yMin, yMax } = action;
            const { yAxisLock } = state;
            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration,
                windowBeginLock: windowBegin,
                windowEndLock: windowEnd,
                ...calcBuffer(windowDuration, windowEnd),
                yMin: yMin === null || yAxisLock ? state.yMin : yMin,
                yMax: yMax === null || yAxisLock ? state.yMax : yMax,
            };
        }
        case ANIMATION: {
            const { windowDuration, windowEnd } = state;
            const calc = calcBuffer(windowDuration, windowEnd);
            if (windowEnd === 0) {
                return {
                    ...state,
                    ...calc,
                    index: options.index,
                };
            }
            return {
                ...state,
                bufferRemaining: calc.bufferRemaining,
            };
        }
        case LOAD_CHART_STATE:
            return { ...state, ...action };
        case DIGITAL_CHANNELS: {
            persistDigitalChannels(action.digitalChannels);
            return { ...state, ...action };
        }
        case TOGGLE_DIGITAL_CHANNELS: {
            persistDigitalChannelsVisible(!state.digitalChannelsVisible);
            return {
                ...state,
                digitalChannelsVisible: !state.digitalChannelsVisible,
            };
        }
        case TOGGLE_TIMESTAMPS: {
            persistTimestampsVisible(!state.timestampsVisible);
            return {
                ...state,
                timestampsVisible: !state.timestampsVisible,
            };
        }
        case TOGGLE_Y_AXIS_LOCK: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { yMin, yMax, ...s } = state;
            return { ...s, ...action, yAxisLock: !state.yAxisLock };
        }
        case UPDATE_HAS_DIGITAL_CHANNELS:
            return { ...state, ...action };
        case CHART_WINDOW_LOCK:
            return {
                ...state,
                windowBeginLock: state.windowBegin,
                windowEndLock: state.windowEnd,
            };
        case CHART_WINDOW_UNLOCK:
            return {
                ...state,
                windowBeginLock: null,
                windowEndLock: null,
            };
        default:
            return state;
    }
};

export const chartState = ({ app }) => app.chart;
