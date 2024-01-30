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
    getSamplingMode as getPersistedSamplingMode,
    setAutoStopSampling as persistAutoStopSampling,
    setDuration as persistDuration,
    setDurationUnit as persistDurationUnit,
    setSampleFreq as persistSampleFreq,
    setSamplingMode as persistSamplingMode,
    TimeUnit,
} from '../utils/persistentStore';
import type { RootState } from '.';

export interface DataLoggerState {
    samplingTime: number;
    maxFreqLog10: number;
    sampleFreqLog10: number;
    sampleFreq: number;
    maxSampleFreq: number;
    duration: number;
    durationUnit: TimeUnit;
    autoStopSampling: boolean;
    mode: SamplingMode;
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
    mode: getPersistedSamplingMode('Live'),
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
        setSamplingMode: (state, action: PayloadAction<SamplingMode>) => {
            state.mode = action.payload;
            persistSamplingMode(action.payload);
        },
    },
});

export const dataLoggerState = (state: RootState) => state.app.dataLogger;
export const getSampleFrequency = (state: RootState) =>
    state.app.dataLogger.sampleFreq;
export const getSamplingMode = (state: RootState) => state.app.dataLogger.mode;

export const {
    setSamplingAttrsAction,
    updateSampleFreqLog10,
    updateDuration,
    updateDurationUnit,
    setDataLoggerState,
    setAutoStopSampling,
    setSamplingMode,
} = dataLoggerSlice.actions;

export default dataLoggerSlice.reducer;
