/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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
