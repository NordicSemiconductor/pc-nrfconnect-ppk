/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion  -- temporarily added to be conservative while converting to typescript */

import { numberOfDigitalChannels } from '../../../globals';
import { lineDataForBitState } from '../../../utils/bitConversion';
import { createEmptyArrayWithDigitalChannelStates } from './commonBitDataFunctions';
import type {
    BitStateType,
    DigitalChannelStates,
    TimestampType,
} from './dataTypes';

export interface BitDataStorage {
    lineData: DigitalChannelStates[];
    bitIndexes: Array<number>;
    previousBitStates: Array<BitStateType | null>;
    digitalChannelsToCompute: number[] | undefined;
    latestTimestamp: TimestampType;

    initialise: (digitalChannelsToCompute: number[]) => void;
    storeEntry: (
        timestamp: TimestampType,
        bitNumber: number,
        bitState: BitStateType
    ) => void;
    storeBit: (
        timestamp: TimestampType,
        bitNumber: number,
        bitState: BitStateType
    ) => void;
    addFinalEntries: () => void;
    getLineData: () => DigitalChannelStates[];
}

export default (): BitDataStorage => ({
    lineData: [...Array(numberOfDigitalChannels)].map(() => ({
        mainLine: createEmptyArrayWithDigitalChannelStates(),
        uncertaintyLine: createEmptyArrayWithDigitalChannelStates(),
    })),
    bitIndexes: new Array(numberOfDigitalChannels),
    previousBitStates: new Array(numberOfDigitalChannels),
    digitalChannelsToCompute: undefined as number[] | undefined,
    latestTimestamp: undefined as TimestampType,

    initialise(digitalChannelsToCompute: number[]) {
        for (let i = 0; i < this.bitIndexes.length; i += 1) {
            this.bitIndexes[i] = 0;
        }

        for (let i = 0; i < this.previousBitStates.length; i += 1) {
            this.previousBitStates[i] = null;
        }

        this.latestTimestamp = undefined;
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    storeEntry(timestamp, bitNumber, bitState) {
        const current = this.lineData[bitNumber];
        const bitIndex = this.bitIndexes[bitNumber];
        const lineData = lineDataForBitState[bitState];

        current.mainLine[bitIndex].x = timestamp;
        current.mainLine[bitIndex].y = lineData.mainLine;

        current.uncertaintyLine[bitIndex].x = timestamp;
        current.uncertaintyLine[bitIndex].y = lineData.uncertaintyLine;

        this.bitIndexes[bitNumber] += 1;
    },

    storeBit(timestamp, bitNumber, bitState) {
        this.latestTimestamp = timestamp;

        const bitChanged = this.previousBitStates[bitNumber] !== bitState;
        if (bitChanged) {
            this.storeEntry(timestamp, bitNumber, bitState);

            this.previousBitStates[bitNumber] = bitState;
        }
    },

    addFinalEntries() {
        if (this.digitalChannelsToCompute) {
            this.digitalChannelsToCompute.forEach(i => {
                const hasEntry = this.bitIndexes[i] > 0;
                const lastEntryIsNotForLastTimestamp =
                    this.latestTimestamp !==
                    this.lineData[i].mainLine[this.bitIndexes[i] - 1]?.x;

                if (hasEntry && lastEntryIsNotForLastTimestamp) {
                    this.storeEntry(
                        this.latestTimestamp!,
                        i,
                        this.previousBitStates[i]!
                    );
                }
            });
        }
    },

    getLineData() {
        this.addFinalEntries();

        return this.lineData.map((bitData, i) => ({
            mainLine: bitData.mainLine.slice(0, this.bitIndexes[i]),
            uncertaintyLine: bitData.uncertaintyLine.slice(
                0,
                this.bitIndexes[i]
            ),
        }));
    },
});
