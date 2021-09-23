/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { options } from '../../../globals';
import { averagedBitState } from '../../../utils/bitConversion';
import bitDataStorage from './bitDataStorage';

export default () => ({
    bitDataStorage: bitDataStorage(),

    initialise(digitalChannelsToCompute) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    processBits(bitIndex, timestamp) {
        const bits = options.bits[bitIndex];

        this.digitalChannelsToCompute.forEach(i => {
            this.bitDataStorage.storeBit(
                timestamp,
                i,
                averagedBitState(bits, i)
            );
        });
    },

    getLineData() {
        return this.bitDataStorage.getLineData();
    },
});
