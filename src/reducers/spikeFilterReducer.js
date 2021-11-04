/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { getSpikeFilter } from '../utils/persistentStore';

const defaults = { samples: 3, alpha: 0.18, alpha5: 0.06 };

const initialState = getSpikeFilter(defaults);

const SPIKE_FILTER_UPDATE = 'SPIKE_FILTER_UPDATE';

export const updateSpikeFilterAction = spikeFilter => ({
    type: SPIKE_FILTER_UPDATE,
    ...spikeFilter,
});

export const resetSpikeFilterToDefaults = () => ({
    type: SPIKE_FILTER_UPDATE,
    ...defaults,
});

export default (state = initialState, { type, ...action }) => {
    switch (type) {
        case SPIKE_FILTER_UPDATE:
            return { ...state, ...action };
        default:
            return state;
    }
};

export const spikeFilterState = ({ app }) => app.spikeFilter;
