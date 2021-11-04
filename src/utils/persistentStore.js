/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import Store from 'electron-store';
import { getAppDataDir } from 'pc-nrfconnect-shared';

const persistentStore = new Store({ name: 'pc-nrfconnect-ppk' });

export const getLastSaveDir = () =>
    persistentStore.get('lastSaveDir', getAppDataDir());
export const setLastSaveDir = dir => persistentStore.set('lastSaveDir', dir);
export const getSpikeFilter = defaults => ({
    samples: persistentStore.get('spikeFilter.samples', defaults.samples),
    alpha: persistentStore.get('spikeFilter.alpha', defaults.alpha),
    alpha5: persistentStore.get('spikeFilter.alpha5', defaults.alpha5),
});
export const setSpikeFilter = ({ samples, alpha, alpha5 }) => {
    persistentStore.set('spikeFilter.samples', samples);
    persistentStore.set('spikeFilter.alpha', alpha);
    persistentStore.set('spikeFilter.alpha5', alpha5);
};

export const getDigitalChannels = () =>
    persistentStore.get('digitalChannels', [
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
    persistentStore.set('digitalChannels', digitalChannels);

export const getDigitalChannelsVisible = () =>
    persistentStore.get('digitalChannelsVisible', true);
export const setDigitalChannelsVisible = digitalChannelsVisible =>
    persistentStore.set('digitalChannelsVisible', digitalChannelsVisible);

export const getTimestampsVisible = () =>
    persistentStore.get('timestampsVisible', false);
export const setTimestampsVisible = timestampsVisible =>
    persistentStore.set('timestampsVisible', timestampsVisible);

export const getSampleFreq = maxSampleFreq =>
    persistentStore.get(`sampleFreq-${maxSampleFreq}`, maxSampleFreq);
export const setSampleFreq = (maxSampleFreq, sampleFreq) =>
    persistentStore.set(`sampleFreq-${maxSampleFreq}`, sampleFreq);

export const getDuration = (maxSampleFreq, defaultValue) =>
    persistentStore.get(`durationSeconds-${maxSampleFreq}`, defaultValue);
export const setDuration = (maxSampleFreq, durationSeconds) =>
    persistentStore.set(`durationSeconds-${maxSampleFreq}`, durationSeconds);
