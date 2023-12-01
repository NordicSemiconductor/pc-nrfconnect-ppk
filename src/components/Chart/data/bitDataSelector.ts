/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { numberOfDigitalChannels } from '../../../globals';
import { averagedBitState } from '../../../utils/bitConversion';
import bitDataStorage, { BitDataStorage } from './bitDataStorage';
import { DigitalChannelStates, TimestampType } from './dataTypes';

export interface BitDataSelector {
    bitDataStorage: BitDataStorage;
    digitalChannelsToCompute: number[];
    initialise: (digitalChannelsToCompute: number[]) => void;
    processBits: (bits: number, timestamp: TimestampType) => void;
    getLineData: () => DigitalChannelStates[];
}

export default (): BitDataSelector => ({
    bitDataStorage: bitDataStorage(),
    digitalChannelsToCompute: new Array(numberOfDigitalChannels),

    initialise(digitalChannelsToCompute) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    processBits(bits, timestamp) {
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
