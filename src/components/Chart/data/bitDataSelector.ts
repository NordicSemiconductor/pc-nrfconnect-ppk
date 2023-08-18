/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { numberOfDigitalChannels, options } from '../../../globals';
import { averagedBitState } from '../../../utils/bitConversion';
import bitDataStorage, { BitDataStorage } from './bitDataStorage';
import { DigitalChannelStates, TimestampType } from './dataTypes';

export interface BitDataSelector {
    bitDataStorage: BitDataStorage;
    digitalChannelsToCompute: number[] | undefined;
    initialise: (digitalChannelsToCompute: number[]) => void;
    processBits: (bitIndex: number, timestamp: TimestampType) => void;
    getLineData: () => DigitalChannelStates[];
}

export default (): BitDataSelector => ({
    bitDataStorage: bitDataStorage(),
    digitalChannelsToCompute: new Array(numberOfDigitalChannels),

    initialise(digitalChannelsToCompute) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    processBits(bitIndex, timestamp) {
        const bits = options.bits ? options.bits[bitIndex] : null;

        if (bits) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.digitalChannelsToCompute!.forEach(i => {
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
