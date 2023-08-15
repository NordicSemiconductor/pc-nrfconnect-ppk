/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { unit } from 'mathjs';

import {
    getDuration,
    getMaxBufferSize,
    getSampleFreq,
    setDuration as persistDuration,
    setMaxBufferSize as persistMaxBufferSize,
    setSampleFreq as persistSampleFreq,
} from '../utils/persistentStore';
import type { RootState } from '.';

const getAdjustedRanges = (maxBufferSize: number, ranges: Ranges): Ranges => {
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

interface Range {
    name: string;
    multiplier: number;
    min: number;
    max: number;
    frequency: number;
}

type Ranges = Range[];

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

export interface DataLoggerState {
    samplingTime: number;
    maxFreqLog10: number;
    sampleFreqLog10: number;
    sampleFreq: number;
    maxSampleFreq: number;
    durationSeconds: number;
    ranges: Ranges;
    range: Range;
    maxBufferSize: number;
}

const initialFreqLog10 = 5;
const initialState = (): DataLoggerState => ({
    samplingTime: 10,
    maxFreqLog10: initialFreqLog10,
    sampleFreqLog10: initialFreqLog10,
    sampleFreq: 10 ** initialFreqLog10,
    maxSampleFreq: 10 ** initialFreqLog10,
    durationSeconds: 300,
    ranges: initialRanges,
    range: initialRanges[initialFreqLog10],
    maxBufferSize: initialMaxBufferSize,
});

const dataLoggerSlice = createSlice({
    name: 'dataLogger',
    initialState: initialState(),
    reducers: {
        setSamplingAttrsAction: (
            state,
            action: PayloadAction<{ maxContiniousSamplingTimeUs: number }>
        ) => {
            const samplingTime = action.payload.maxContiniousSamplingTimeUs;
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
        },
        updateSampleFreqLog10: (
            state,
            action: PayloadAction<{ sampleFreqLog10: number }>
        ) => {
            const { sampleFreqLog10 } = action.payload;

            const { maxSampleFreq } = state;
            const range = state.ranges[sampleFreqLog10];
            const sampleFreq = Math.min(10 ** sampleFreqLog10, maxSampleFreq);

            persistSampleFreq(maxSampleFreq, sampleFreq);

            const { min, max, multiplier } = range;
            const durationSeconds = Math.min(
                Math.max(min * multiplier, state.durationSeconds),
                max * multiplier
            );

            persistDuration(maxSampleFreq, durationSeconds);

            return {
                ...state,
                ...action.payload,
                durationSeconds,
                sampleFreq,
                range,
            };
        },
        updateDurationSeconds: (
            state,
            action: PayloadAction<{ durationSeconds: number }>
        ) => {
            const { durationSeconds } = action.payload;
            persistDuration(state.maxSampleFreq, durationSeconds);
            return { ...state, durationSeconds };
        },
        setDataLoggerState: (
            state,
            action: PayloadAction<{ state: DataLoggerState }>
        ) => ({ ...state, ...action.payload.state }),
        changeMaxBufferSizeAction: (
            state,
            action: PayloadAction<{ maxBufferSize: number }>
        ) => {
            const { range, ranges, durationSeconds } = state;
            const { maxBufferSize } = action.payload;

            const newRanges = getAdjustedRanges(maxBufferSize, ranges);
            const newDurationSeconds = Math.min(range.max, durationSeconds);

            persistDuration(state.maxSampleFreq, durationSeconds);
            persistMaxBufferSize(maxBufferSize);

            return {
                ...state,
                maxBufferSize,
                ranges: newRanges,
                durationSeconds: newDurationSeconds,
            };
        },
    },
});

export const dataLoggerState = (state: RootState) => state.app.dataLogger;
export const maxBufferSize = (state: RootState) =>
    state.app.dataLogger.maxBufferSize;
export const getSampleFrequency = (state: RootState) =>
    state.app.dataLogger.sampleFreq;
export const getMaxSampleFrequency = (state: RootState) =>
    state.app.dataLogger.maxSampleFreq;

export const {
    setSamplingAttrsAction,
    updateSampleFreqLog10,
    updateDurationSeconds,
    setDataLoggerState,
    changeMaxBufferSizeAction,
} = dataLoggerSlice.actions;

export default dataLoggerSlice.reducer;
