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
