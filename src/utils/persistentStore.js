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

export const getLastSaveDir = () => store().get('lastSaveDir', getAppDataDir());
export const setLastSaveDir = dir => store().set('lastSaveDir', dir);

export const getSpikeFilter = defaults => ({
    samples: store().get('spikeFilter.samples', defaults.samples),
    alpha: store().get('spikeFilter.alpha', defaults.alpha),
    alpha5: store().get('spikeFilter.alpha5', defaults.alpha5),
});
export const setSpikeFilter = ({ samples, alpha, alpha5 }) => {
    store().set('spikeFilter.samples', samples);
    store().set('spikeFilter.alpha', alpha);
    store().set('spikeFilter.alpha5', alpha5);
};

export const getDigitalChannels = () =>
    store().get('digitalChannels', [
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
    ]);
export const setDigitalChannels = digitalChannels =>
    store().set('digitalChannels', digitalChannels);

export const getDigitalChannelsVisible = () =>
    store().get('digitalChannelsVisible', true);
export const setDigitalChannelsVisible = digitalChannelsVisible =>
    store().set('digitalChannelsVisible', digitalChannelsVisible);

export const getTimestampsVisible = () =>
    store().get('timestampsVisible', false);
export const setTimestampsVisible = timestampsVisible =>
    store().set('timestampsVisible', timestampsVisible);

export const getSampleFreq = maxSampleFreq =>
    store().get(`sampleFreq-${maxSampleFreq}`, maxSampleFreq);
export const setSampleFreq = (maxSampleFreq, sampleFreq) =>
    store().set(`sampleFreq-${maxSampleFreq}`, sampleFreq);

export const getDuration = (maxSampleFreq, defaultValue) =>
    store().get(`durationSeconds-${maxSampleFreq}`, defaultValue);
export const setDuration = (maxSampleFreq, durationSeconds) =>
    store().set(`durationSeconds-${maxSampleFreq}`, durationSeconds);

export const getMaxBufferSize = defaultMaxBufferSize => {
    const storedValue = store().get('maxBufferSize', defaultMaxBufferSize);
    return storedValue > unit(maxBufferSizeForSystem, 'bytes').toNumber('MB')
        ? defaultMaxBufferSize
        : storedValue;
};
export const setMaxBufferSize = maxBufferSize =>
    store().set('maxBufferSize', maxBufferSize);

export const getVoltageRegulatorMaxCap = defaultMaxCap =>
    store().get('voltageRegulatorMaxCap', defaultMaxCap);
export const setVoltageRegulatorMaxCap = maxCap =>
    store().set('voltageRegulatorMaxCap', maxCap);
