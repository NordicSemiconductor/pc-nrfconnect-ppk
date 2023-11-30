/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion -- added temporarily to be conservative while converting to typescript */

import { numberOfDigitalChannels } from '../../../globals';
import {
    always0,
    always1,
    averagedBitState,
    sometimes0And1,
} from '../../../utils/bitConversion';
import bitDataStorage, { BitDataStorage } from './bitDataStorage';
import {
    BitStateIndexType,
    DigitalChannelStates,
    TimestampType,
} from './dataTypes';

export interface BitDataAccumulator {
    bitDataStorage: BitDataStorage;
    accumulator: Array<BitStateIndexType | null>;
    digitalChannelsToCompute: number[] | undefined;
    initialise: (digitalChannelsToCompute: number[]) => void;
    processBits: (bits: number) => void;
    processBitState: (bitState: BitStateIndexType, channel: number) => void;
    processAccumulatedBits: (timestamp: TimestampType) => void;
    getLineData: () => DigitalChannelStates[];
}

export default (): BitDataAccumulator => ({
    bitDataStorage: bitDataStorage(),
    accumulator: new Array(numberOfDigitalChannels),
    digitalChannelsToCompute: undefined as number[] | undefined,

    initialise(digitalChannelsToCompute) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
        // .fill is slower then a normal for loop when array is large
        for (let i = 0; i < this.accumulator.length; i += 1) {
            this.accumulator[i] = null;
        }
    },

    processBits(bits) {
        this.digitalChannelsToCompute!.forEach(i => {
            const bitState = averagedBitState(bits, i);
            this.processBitState(bitState, i);
        });
    },

    processBitState(bitState, channel) {
        if (this.accumulator[channel] === null) {
            this.accumulator[channel] = bitState;
        } else if (
            (this.accumulator[channel] === always1 && bitState !== always1) ||
            (this.accumulator[channel] === always0 && bitState !== always0)
        ) {
            this.accumulator[channel] = sometimes0And1;
        }
    },

    processAccumulatedBits(timestamp) {
        this.digitalChannelsToCompute!.forEach(i => {
            const bitState = this.accumulator[i];
            if (bitState != null)
                this.bitDataStorage.storeBit(timestamp, i, bitState);
        });

        // .fill is slower then a normal for loop when array is large
        for (let i = 0; i < this.accumulator.length; i += 1) {
            this.accumulator[i] = null;
        }
    },

    getLineData() {
        return this.bitDataStorage.getLineData();
    },
});
