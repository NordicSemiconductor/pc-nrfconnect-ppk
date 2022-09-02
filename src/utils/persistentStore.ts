/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { kMaxLength as maxBufferSizeForSystem } from 'buffer';
import { unit } from 'mathjs';
import {
    getAppDataDir,
    getPersistentStore as store,
} from 'pc-nrfconnect-shared';

const LAST_SAVE_DIR = 'lastSaveDir';
const SPIKE_FILTER_SAMPLES = 'spikeFilter.samples';
const SPIKE_FILTER_ALPHA = 'spikeFilter.alpha';
const SPIKE_FILTER_ALPHA5 = 'spikeFilter.alpha5';
const DIGITAL_CHANNELS_VISIBLE = 'digitalChannelsVisible';
const DIGITAL_CHANNELS = 'digitalChannels';
const TIMESTAMPS_VISIBLE = 'timestampsVisible';
const MAX_BUFFER_SIZE = 'maxBufferSize';
const VOLTAGE_REGULATOR_MAX_CAP = 'voltageRegulatorMaxCap';

type SAMPLE_FREQUENCY = `sampleFreq-${number}`;
type DURATION_SECONDS = `durationSeconds-${number}`;

export interface SpikeFilter {
    samples: number;
    alpha: number;
    alpha5: number;
}

export type booleanTupleOf8 = [
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean
];

interface StoreSchema {
    [LAST_SAVE_DIR]: string;
    [SPIKE_FILTER_SAMPLES]: number;
    [SPIKE_FILTER_ALPHA]: number;
    [SPIKE_FILTER_ALPHA5]: number;

    [DIGITAL_CHANNELS_VISIBLE]: boolean;
    [DIGITAL_CHANNELS]: booleanTupleOf8;
    [TIMESTAMPS_VISIBLE]: boolean;

    [MAX_BUFFER_SIZE]: number;
    [VOLTAGE_REGULATOR_MAX_CAP]: number;

    [maxSampleFrequency: SAMPLE_FREQUENCY]: number;
    [maxSampleFrequency: DURATION_SECONDS]: number;
}

export const getLastSaveDir = () =>
    store<StoreSchema>().get('lastSaveDir', getAppDataDir());
export const setLastSaveDir = (dir: string) =>
    store<StoreSchema>().set('lastSaveDir', dir);

export const getSpikeFilter = (defaults: SpikeFilter): SpikeFilter => ({
    samples: store<StoreSchema>().get('spikeFilter.samples', defaults.samples),
    alpha: store<StoreSchema>().get('spikeFilter.alpha', defaults.alpha),
    alpha5: store<StoreSchema>().get('spikeFilter.alpha5', defaults.alpha5),
});
export const setSpikeFilter = ({ samples, alpha, alpha5 }: SpikeFilter) => {
    store<StoreSchema>().set('spikeFilter.samples', samples);
    store<StoreSchema>().set('spikeFilter.alpha', alpha);
    store<StoreSchema>().set('spikeFilter.alpha5', alpha5);
};

export const getDigitalChannels = () =>
    store<StoreSchema>().get(DIGITAL_CHANNELS, [
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
    ]);
export const setDigitalChannels = (digitalChannels: booleanTupleOf8) =>
    store<StoreSchema>().set(DIGITAL_CHANNELS, digitalChannels);

export const getDigitalChannelsVisible = () =>
    store<StoreSchema>().get(DIGITAL_CHANNELS_VISIBLE, true);
export const setDigitalChannelsVisible = (digitalChannelsVisible: boolean) =>
    store<StoreSchema>().set(DIGITAL_CHANNELS_VISIBLE, digitalChannelsVisible);

export const getTimestampsVisible = () =>
    store<StoreSchema>().get(TIMESTAMPS_VISIBLE, false);
export const setTimestampsVisible = (timestampsVisible: boolean) =>
    store<StoreSchema>().set(TIMESTAMPS_VISIBLE, timestampsVisible);

export const getSampleFreq = (maxSampleFreq: number) =>
    store<StoreSchema>().get(`sampleFreq-${maxSampleFreq}`, maxSampleFreq);
export const setSampleFreq = (maxSampleFreq: number, sampleFreq: number) =>
    store<StoreSchema>().set(`sampleFreq-${maxSampleFreq}`, sampleFreq);

export const getDuration = (maxSampleFreq: number, defaultValue: number) =>
    store<StoreSchema>().get(`durationSeconds-${maxSampleFreq}`, defaultValue);
export const setDuration = (maxSampleFreq: number, durationSeconds: number) =>
    store<StoreSchema>().set(
        `durationSeconds-${maxSampleFreq}`,
        durationSeconds
    );

export const getMaxBufferSize = (defaultMaxBufferSize: number) => {
    const storedValue = store<StoreSchema>().get(
        MAX_BUFFER_SIZE,
        defaultMaxBufferSize
    );
    return storedValue > unit(maxBufferSizeForSystem, 'bytes').toNumber('MB')
        ? defaultMaxBufferSize
        : storedValue;
};
export const setMaxBufferSize = (maxBufferSize: number) =>
    store<StoreSchema>().set(MAX_BUFFER_SIZE, maxBufferSize);

export const getVoltageRegulatorMaxCap = (defaultMaxCap: number) =>
    store<StoreSchema>().get(VOLTAGE_REGULATOR_MAX_CAP, defaultMaxCap);
export const setVoltageRegulatorMaxCap = (maxCap: number) =>
    store<StoreSchema>().set(VOLTAGE_REGULATOR_MAX_CAP, maxCap);
