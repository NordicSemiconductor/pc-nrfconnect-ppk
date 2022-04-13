/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { numberOfDigitalChannels, options } from '../../../globals';
import { averagedBitState } from '../../../utils/bitConversion';
import bitDataStorage from './bitDataStorage';
import { DigitalChannelsType, TimestampType } from './dataTypes';

export default () => ({
    bitDataStorage: bitDataStorage(),
    digitalChannelsToCompute: new Array(numberOfDigitalChannels),

    initialise(digitalChannelsToCompute: DigitalChannelsType) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    processBits(bitIndex: number, timestamp: TimestampType) {
        const bits = options.bits ? options.bits[bitIndex] : null;

        if (bits) {
            this.digitalChannelsToCompute.forEach(i => {
                this.bitDataStorage.storeBit(
                    timestamp,
                    i,
                    averagedBitState(bits, i)
                );
            });
        }
    },

    getLineData() {
        return this.bitDataStorage.getLineData();
    },
});
