/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
    getAutoStopSampling,
    getDuration,
    getDurationUnit,
    getSampleFreq,
    setAutoStopSampling as persistAutoStopSampling,
    setDuration as persistDuration,
    setDurationUnit as persistDurationUnit,
    setSampleFreq as persistSampleFreq,
    TimeUnit,
} from '../utils/persistentStore';
import type { RootState } from '.';

export const convertTimeToSeconds = (time: number, timeUnit: TimeUnit) => {
    switch (timeUnit) {
        case 's':
            return time;
        case 'm':
            return time * 60;
        case 'h':
            return time * 60 * 60;
        case 'd':
            return time * 24 * 60 * 60;
    }
};

export interface DataLoggerState {
    samplingTime: number;
    maxFreqLog10: number;
    sampleFreqLog10: number;
    sampleFreq: number;
    maxSampleFreq: number;
    duration: number;
    durationUnit: TimeUnit;
    autoStopSampling: boolean;
}

const initialFreqLog10 = 5;
const initialState = (): DataLoggerState => ({
    samplingTime: 10,
    maxFreqLog10: initialFreqLog10,
    sampleFreqLog10: initialFreqLog10,
    sampleFreq: 10 ** initialFreqLog10,
    maxSampleFreq: 10 ** initialFreqLog10,
    duration: 300,
    durationUnit: 's',
    autoStopSampling: true,
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
            const savedDuration = getDuration(maxSampleFreq, state.duration);
            const savedDurationUnit = getDurationUnit(
                maxSampleFreq,
                state.durationUnit
            );
            const savedAutoStopSampling = getAutoStopSampling(
                state.autoStopSampling
            );

            return {
                ...state,
                samplingTime,
                sampleFreq,
                maxSampleFreq,
                maxFreqLog10,
                sampleFreqLog10: Math.ceil(Math.log10(sampleFreq)),
                duration: savedDuration,
                durationUnit: savedDurationUnit,
                autoStopSampling: savedAutoStopSampling,
            };
        },
        updateSampleFreqLog10: (
            state,
            action: PayloadAction<{ sampleFreqLog10: number }>
        ) => {
            const { sampleFreqLog10 } = action.payload;

            const { maxSampleFreq } = state;
            const sampleFreq = Math.min(10 ** sampleFreqLog10, maxSampleFreq);

            persistSampleFreq(maxSampleFreq, sampleFreq);
            persistDuration(maxSampleFreq, state.duration);
            persistDurationUnit(maxSampleFreq, state.durationUnit);

            state.sampleFreqLog10 = sampleFreqLog10;
            state.sampleFreq = sampleFreq;
        },
        updateDuration: (state, action: PayloadAction<number>) => {
            persistDuration(state.maxSampleFreq, action.payload);
            state.duration = action.payload;
        },
        updateDurationUnit: (state, action: PayloadAction<TimeUnit>) => {
            persistDurationUnit(state.maxSampleFreq, action.payload);
            state.durationUnit = action.payload;
        },
        setAutoStopSampling: (state, action: PayloadAction<boolean>) => {
            persistAutoStopSampling(action.payload);
            state.autoStopSampling = action.payload;
        },
        setDataLoggerState: (
            state,
            action: PayloadAction<{ state: DataLoggerState }>
        ) => ({ ...state, ...action.payload.state }),
    },
});

export const dataLoggerState = (state: RootState) => state.app.dataLogger;
export const getSampleFrequency = (state: RootState) =>
    state.app.dataLogger.sampleFreq;

export const {
    setSamplingAttrsAction,
    updateSampleFreqLog10,
    updateDuration,
    updateDurationUnit,
    setDataLoggerState,
    setAutoStopSampling,
} = dataLoggerSlice.actions;

export default dataLoggerSlice.reducer;
