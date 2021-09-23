/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import persistentStore from '../utils/persistentStore';

const ranges = [
    { name: 'days', multiplier: 24 * 60 * 60, min: 7, max: 500 }, // 1Hz
    { name: 'days', multiplier: 24 * 60 * 60, min: 1, max: 50 }, // 10Hz
    { name: 'hours', multiplier: 60 * 60, min: 6, max: 120 }, // 100Hz
    { name: 'hours', multiplier: 60 * 60, min: 1, max: 12 }, // 1kHz
    { name: 'minutes', multiplier: 60, min: 10, max: 72 }, // 7.7-10kHz
    { name: 'seconds', multiplier: 1, min: 60, max: 432 }, // 100kHz
];

const initialFreqLog10 = 5;

const initialState = {
    samplingTime: 10,
    maxFreqLog10: initialFreqLog10,
    sampleFreqLog10: initialFreqLog10,
    sampleFreq: 10 ** initialFreqLog10,
    maxSampleFreq: 10 ** initialFreqLog10,
    durationSeconds: 300,
    range: ranges[initialFreqLog10],
};

const DL_SAMPLE_FREQ_LOG_10 = 'DL_SAMPLE_FREQ_LOG_10';
const DL_DURATION_SECONDS = 'DL_DURATION_SECONDS';
const SET_SAMPLING_ATTRS = 'SET_SAMPLING_ATTRS';
const SET_DATA_LOGGER_STATE = 'SET_DATA_LOGGER_STATE';

export const updateSampleFreqLog10 = sampleFreqLog10 => ({
    type: DL_SAMPLE_FREQ_LOG_10,
    sampleFreqLog10,
    range: ranges[sampleFreqLog10],
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

export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case SET_SAMPLING_ATTRS: {
            const samplingTime = action.maxContinuousSamplingTimeUs;
            const maxSampleFreq = Math.round(10000 / samplingTime) * 100;
            const maxFreqLog10 = Math.ceil(Math.log10(maxSampleFreq));
            const sampleFreq = persistentStore.get(
                `sampleFreq-${maxSampleFreq}`,
                maxSampleFreq
            );
            const sampleFreqLog10 = Math.ceil(Math.log10(sampleFreq));
            const range = ranges[sampleFreqLog10];
            const { min, max, multiplier } = range;
            const savedDuration = persistentStore.get(
                `durationSeconds-${maxSampleFreq}`,
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
            const {
                range: { min, max, multiplier },
            } = action;
            const sampleFreq = Math.min(
                10 ** action.sampleFreqLog10,
                state.maxSampleFreq
            );
            persistentStore.set(`sampleFreq-${maxSampleFreq}`, sampleFreq);
            const durationSeconds = Math.min(
                Math.max(min * multiplier, state.durationSeconds),
                max * multiplier
            );
            persistentStore.set(
                `durationSeconds-${maxSampleFreq}`,
                durationSeconds
            );
            return {
                ...state,
                ...action,
                durationSeconds,
                sampleFreq,
            };
        }
        case DL_DURATION_SECONDS: {
            persistentStore.set(
                `durationSeconds-${state.maxSampleFreq}`,
                action.durationSeconds
            );
            return { ...state, ...action };
        }
        case SET_DATA_LOGGER_STATE: {
            return { ...state, ...action };
        }
        default:
            return state;
    }
};

export const dataLoggerState = ({ app }) => app.dataLogger;
