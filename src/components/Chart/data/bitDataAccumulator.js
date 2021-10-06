/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { nbDigitalChannels, options } from '../../../globals';
import {
    always0,
    always1,
    averagedBitState,
    sometimes0And1,
} from '../../../utils/bitConversion';
import bitDataStorage from './bitDataStorage';

export default () => ({
    bitDataStorage: bitDataStorage(),
    accumulator: new Array(nbDigitalChannels),

    initialise(digitalChannelsToCompute) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
        this.accumulator.fill(null);
    },

    processBits(bitIndex) {
        const bits = options.bits[bitIndex];

        this.digitalChannelsToCompute.forEach(i => {
            const bitState = averagedBitState(bits, i);

            if (this.accumulator[i] === null) {
                this.accumulator[i] = bitState;
            } else if (
                (this.accumulator[i] === always1 && bitState !== always1) ||
                (this.accumulator[i] === always0 && bitState !== always0)
            ) {
                this.accumulator[i] = sometimes0And1;
            }
        });
    },

    processAccumulatedBits(timestamp) {
        this.digitalChannelsToCompute.forEach(i => {
            this.bitDataStorage.storeBit(timestamp, i, this.accumulator[i]);
        });

        this.accumulator.fill(null);
    },

    getLineData() {
        return this.bitDataStorage.getLineData();
    },
});
