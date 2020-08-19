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

import { options } from '../globals';

const initialWindowDuration = 7 * 1e6;
const initialBufferLength = ((options.data.length / options.samplesPerSecond) * 1e6)
              - initialWindowDuration;
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
    digitalChannels: [],
    digitalChannelsVisible: true,
    timestampsVisible: true,
    triggerHandleVisible: true,
};

const ANIMATION = 'ANIMATION';
const CHART_CURSOR = 'CHART_CURSOR';
const CHART_WINDOW = 'CHART_WINDOW';
const LOAD_CHART_STATE = 'LOAD_CHART_STATE';
const DIGITAL_CHANNELS = 'DIGITAL_CHANNELS';
const TOGGLE_DIGITAL_CHANNELS = 'TOGGLE_DIGITAL_CHANNELS';
const TOGGLE_TIMESTAMPS = 'TOGGLE_TIMESTAMPS';
const TOGGLE_TRIGGER_HANDLE = 'TOGGLE_TRIGGER_HANDLE';

const MIN_WINDOW_DURATION = 1000;
const MAX_WINDOW_DURATION = 120000000;

export const animationAction = () => ({
    type: ANIMATION,
});

export const chartCursorAction = (cursorBegin, cursorEnd) => ({
    type: CHART_CURSOR,
    cursorBegin,
    cursorEnd,
});

export const chartWindowAction = (
    windowBegin, windowEnd, windowDuration, yMin, yMax,
) => {
    const duration = Math.min(MAX_WINDOW_DURATION, Math.max(MIN_WINDOW_DURATION, windowDuration));
    if (windowBegin === null && windowEnd === null) {
        return {
            type: CHART_WINDOW,
            windowBegin: 0,
            windowEnd: 0,
            windowDuration: windowDuration === null ? null : duration,
            yMin,
            yMax,
        };
    }
    const half = duration / 2;
    const center = (windowBegin + windowEnd) / 2;
    return {
        type: CHART_WINDOW,
        windowBegin: center - half,
        windowEnd: center + half,
        windowDuration: duration,
        yMin,
        yMax,
    };
};

export const setChartState = state => ({
    type: LOAD_CHART_STATE,
    ...state,
});

export const setDigitalChannels = digitalChannels => ({
    type: DIGITAL_CHANNELS,
    digitalChannels,
});

export const toggleDigitalChannels = () => ({ type: TOGGLE_DIGITAL_CHANNELS });
export const toggleTimestamps = () => ({ type: TOGGLE_TIMESTAMPS });
export const toggleTriggerHandle = () => ({ type: TOGGLE_TRIGGER_HANDLE });

function calcBuffer(windowDuration, windowEnd) {
    const { data, samplesPerSecond, timestamp } = options;
    const totalInUs = (data.length / samplesPerSecond) * 1e6;
    const bufferLength = totalInUs - windowDuration;
    const bufferRemaining = (windowEnd !== 0)
        ? (bufferLength - (timestamp - windowEnd))
        : bufferLength;
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
                windowBegin, windowEnd, windowDuration, yMin, yMax,
            } = action;
            return {
                ...state,
                windowBegin,
                windowEnd,
                windowDuration,
                ...calcBuffer(windowDuration, windowEnd),
                yMin: yMin === null ? state.yMin : yMin,
                yMax: yMax === null ? state.yMax : yMax,
            };
        }
        case ANIMATION: {
            const { windowDuration, windowEnd } = state;
            return {
                ...state,
                ...calcBuffer(windowDuration, windowEnd),
                index: options.index,
            };
        }
        case LOAD_CHART_STATE:
        case DIGITAL_CHANNELS: return {
            ...state,
            ...action,
        };
        case TOGGLE_DIGITAL_CHANNELS: return {
            ...state,
            digitalChannelsVisible: !state.digitalChannelsVisible,
        };
        case TOGGLE_TIMESTAMPS: return {
            ...state,
            timestampsVisible: !state.timestampsVisible,
        };
        case TOGGLE_TRIGGER_HANDLE: return {
            ...state,
            triggerHandleVisible: !state.triggerHandleVisible,
        };
        default: return state;
    }
};

export const chartState = ({ app }) => app.chart;
