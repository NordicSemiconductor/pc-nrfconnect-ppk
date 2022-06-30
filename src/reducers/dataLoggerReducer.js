/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { unit } from 'mathjs';

import {
    getDuration,
    getMaxBufferSize,
    getSampleFreq,
    setDuration as persistDuration,
    setMaxBufferSize as persistMaxBufferSize,
    setSampleFreq as persistSampleFreq,
} from '../utils/persistentStore';

/**
 * [Get ranges with max field adjusted for the current maxBufferSize]
 * @param {Number} maxBufferSize []
 * @param {Object} ranges []
 * @returns {Array} [with max field adjusted for max sampling buffer size]
 */
const getAdjustedRanges = (maxBufferSize, ranges) => {
    // Maximum number of elements that the current maxBufferSize could initialize.
    const BYTES_PER_ELEMENT = 4;
    const maxNumberOfElements = Math.floor(
        unit(maxBufferSize, 'MB').to('byte').toNumber() / BYTES_PER_ELEMENT
    );

    return ranges.map(range => {
        // Find out how many seconds, minutes, hours or days is required to fill the array with any given frequency.
        const { multiplier, frequency } = range;
        return {
            ...range,
            max: Math.floor(maxNumberOfElements / (multiplier * frequency)),
        };
    });
};

// Default max buffer size 200MB
const initialMaxBufferSize = getMaxBufferSize(200);
const initialRanges = getAdjustedRanges(initialMaxBufferSize, [
    { name: 'days', multiplier: 24 * 60 * 60, min: 7, max: 500, frequency: 1 }, // 1Hz
    { name: 'days', multiplier: 24 * 60 * 60, min: 1, max: 50, frequency: 10 }, // 10Hz
    { name: 'hours', multiplier: 60 * 60, min: 6, max: 120, frequency: 100 }, // 100Hz
    { name: 'hours', multiplier: 60 * 60, min: 1, max: 12, frequency: 1000 }, // 1kHz
    { name: 'minutes', multiplier: 60, min: 10, max: 72, frequency: 10 * 1000 }, // 7.7-10kHz
    {
        name: 'seconds',
        multiplier: 1,
        min: 60,
        max: 432,
        frequency: 100 * 1000,
    }, // 100kHz
]);

const initialFreqLog10 = 5;

const initialState = {
    samplingTime: 10,
    maxFreqLog10: initialFreqLog10,
    sampleFreqLog10: initialFreqLog10,
    sampleFreq: 10 ** initialFreqLog10,
    maxSampleFreq: 10 ** initialFreqLog10,
    durationSeconds: 300,
    ranges: initialRanges,
    range: initialRanges[initialFreqLog10],
    maxBufferSize: initialMaxBufferSize,
};

const DL_SAMPLE_FREQ_LOG_10 = 'DL_SAMPLE_FREQ_LOG_10';
const DL_DURATION_SECONDS = 'DL_DURATION_SECONDS';
const SET_SAMPLING_ATTRS = 'SET_SAMPLING_ATTRS';
const SET_DATA_LOGGER_STATE = 'SET_DATA_LOGGER_STATE';
const MAX_BUFFER_SIZE = 'MAX_SAMPLE_ARRAY_SIZE_CHANGED';

export const updateSampleFreqLog10 = sampleFreqLog10 => ({
    type: DL_SAMPLE_FREQ_LOG_10,
    sampleFreqLog10,
});

export const updateDurationSeconds = durationSeconds => ({
    type: DL_DURATION_SECONDS,
    durationSeconds,
});

export const setSamplingAttrsAction = maxContinuousSamplingTimeUs => ({
    type: SET_SAMPLING_ATTRS,
    maxContinuousSamplingTimeUs,
});

export const setDataLoggerState = state => ({
    type: SET_DATA_LOGGER_STATE,
    ...state,
});

export const changeMaxBufferSizeAction = maxBufferSize => ({
    type: MAX_BUFFER_SIZE,
    maxBufferSize,
});

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case SET_SAMPLING_ATTRS: {
            const samplingTime = action.maxContinuousSamplingTimeUs;
            const maxSampleFreq = Math.round(10000 / samplingTime) * 100;
            const maxFreqLog10 = Math.ceil(Math.log10(maxSampleFreq));
            const sampleFreq = getSampleFreq(maxSampleFreq);
            const sampleFreqLog10 = Math.ceil(Math.log10(sampleFreq));
            const range = state.ranges[sampleFreqLog10];
            const { min, max, multiplier } = range;
            const savedDuration = getDuration(
                maxSampleFreq,
                state.durationSeconds
            );
            const durationSeconds = Math.min(
                Math.max(min * multiplier, savedDuration),
                max * multiplier
            );
            return {
                ...state,
                samplingTime,
                sampleFreq,
                maxSampleFreq,
                maxFreqLog10,
                sampleFreqLog10,
                durationSeconds,
                range,
            };
        }
        case DL_SAMPLE_FREQ_LOG_10: {
            const { maxSampleFreq } = state;
            const range = state.ranges[action.sampleFreqLog10];
            const sampleFreq = Math.min(
                10 ** action.sampleFreqLog10,
                state.maxSampleFreq
            );
            persistSampleFreq(maxSampleFreq, sampleFreq);
            const { min, max, multiplier } = range;
            const durationSeconds = Math.min(
                Math.max(min * multiplier, state.durationSeconds),
                max * multiplier
            );
            persistDuration(maxSampleFreq, durationSeconds);
            return {
                ...state,
                ...action,
                durationSeconds,
                sampleFreq,
                range,
            };
        }
        case DL_DURATION_SECONDS: {
            persistDuration(state.maxSampleFreq, action.durationSeconds);
            return { ...state, ...action };
        }
        case SET_DATA_LOGGER_STATE: {
            return { ...state, ...action };
        }
        case MAX_BUFFER_SIZE: {
            const { range } = state;
            const { maxBufferSize } = action;
            const { ranges, durationSeconds } = state;

            const newRanges = getAdjustedRanges(maxBufferSize, ranges);
            const newDurationSeconds = Math.min(range.max, durationSeconds);

            persistDuration(state.maxSampleFreq, durationSeconds);
            persistMaxBufferSize(maxBufferSize);
            return { ...state, newRanges, maxBufferSize, newDurationSeconds };
        }
        default:
            return state;
    }
};

export const dataLoggerState = ({ app }) => app.dataLogger;
export const maxBufferSize = state => state.app.dataLogger.maxBufferSize;
export const getSampleFrequency = state => state.app.dataLogger.sampleFreq;
export const getMaxSampleFrequency = state =>
    state.app.dataLogger.maxSampleFreq;
