/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
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

import { options, nbDigitalChannels } from '../globals';
import { isRealTimePane } from '../utils/panes';

import persistentStore from '../utils/persistentStore';

const initialWindowDuration = 7 * 1e6;
const initialBufferLength =
    (options.data.length / options.samplesPerSecond) * 1e6 -
    initialWindowDuration;
const initialState = {
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
    digitalChannels: persistentStore.get(
        'digitalChannels',
        Array(nbDigitalChannels).fill(false)
    ),
    digitalChannelsVisible: persistentStore.get('digitalChannelsVisible', true),
    timestampsVisible: persistentStore.get('timestampsVisible', false),
    yAxisLock: false,
    showGridLines: persistentStore.get('gridlinesVisible', true),
};

const ANIMATION = 'ANIMATION';
const CHART_CURSOR = 'CHART_CURSOR';
const CHART_WINDOW = 'CHART_WINDOW';
const LOAD_CHART_STATE = 'LOAD_CHART_STATE';
const DIGITAL_CHANNELS = 'DIGITAL_CHANNELS';
const TOGGLE_DIGITAL_CHANNELS = 'TOGGLE_DIGITAL_CHANNELS';
const TOGGLE_TIMESTAMPS = 'TOGGLE_TIMESTAMPS';
const UPDATE_HAS_DIGITAL_CHANNELS = 'UPDATE_HAS_DIGITAL_CHANNELS';
const TOGGLE_Y_AXIS_LOCK = 'TOGGLE_Y_AXIS_LOCK';
const TOGGLE_GRID_LINES = 'TOGGLE_GRID_LINES';

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

const chartWindowAction2 = (
    windowBegin,
    windowEnd,
    windowDuration,
    yMin,
    yMax
) => {
    let y0 = yMin;
    let y1 = yMax;

    if (
        yMin !== null &&
        yMin !== undefined &&
        yMax !== null &&
        yMax !== undefined
    ) {
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
    const half = windowDuration / 2;
    const center = (windowBegin + windowEnd) / 2;
    return {
        type: CHART_WINDOW,
        windowBegin: center - half,
        windowEnd: center + half,
        windowDuration,
        yMin: y0,
        yMax: y1,
    };
};

export const chartWindowAction = (
    windowBegin,
    windowEnd,
    windowDuration,
    yMin,
    yMax
) => (dispatch, getState) => {
    const { sampleFreq, maxSampleFreq } = getState().app.dataLogger;
    const { currentPane } = getState().appLayout;
    const sf = isRealTimePane(currentPane) ? maxSampleFreq : sampleFreq;
    const duration =
        windowDuration === null
            ? null
            : Math.min(
                  MAX_WINDOW_DURATION / sf,
                  Math.max(MIN_WINDOW_DURATION / sf, windowDuration)
              );
    dispatch(chartWindowAction2(windowBegin, windowEnd, duration, yMin, yMax));
};

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
    yMin: null,
    yMax: null,
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
export const toggleGridLines = () => ({
    type: TOGGLE_GRID_LINES,
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

export default (state = initialState, { type, ...action }) => {
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
            const {
                windowBegin,
                windowEnd,
                windowDuration,
                yMin,
                yMax,
            } = action;
            const { yAxisLock } = state;
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
            persistentStore.set('digitalChannels', action.digitalChannels);
            return { ...state, ...action };
        }
        case TOGGLE_DIGITAL_CHANNELS: {
            persistentStore.set(
                'digitalChannelsVisible',
                !state.digitalChannelsVisible
            );
            return {
                ...state,
                digitalChannelsVisible: !state.digitalChannelsVisible,
            };
        }
        case TOGGLE_TIMESTAMPS: {
            persistentStore.set('timestampsVisible', !state.timestampsVisible);
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
        case TOGGLE_GRID_LINES:
            persistentStore.set('gridlinesVisible', !state.showGridLines);
            return {
                ...state,
                showGridLines: !state.showGridLines,
            };
        case UPDATE_HAS_DIGITAL_CHANNELS:
            return { ...state, ...action };
        default:
            return state;
    }
};

export const chartState = ({ app }) => app.chart;
