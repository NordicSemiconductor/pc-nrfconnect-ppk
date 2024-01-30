/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { numberOfDigitalChannels } from '../../../globals';
import { lineDataForBitState } from '../../../utils/bitConversion';
import type {
    BitStateType,
    DigitalChannelStates,
    TimestampType,
} from './dataTypes';

export interface BitDataStorage {
    lineData: DigitalChannelStates[];
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
        mainLine: [],
        uncertaintyLine: [],
    })),
    previousBitStates: new Array(numberOfDigitalChannels),
    digitalChannelsToCompute: undefined as number[] | undefined,
    latestTimestamp: undefined as TimestampType,

    initialise(digitalChannelsToCompute: number[]) {
        for (let i = 0; i < this.previousBitStates.length; i += 1) {
            this.previousBitStates[i] = null;
        }

        this.latestTimestamp = undefined;
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    storeEntry(timestamp, bitNumber, bitState) {
        const current = this.lineData[bitNumber];
        const lineData = lineDataForBitState[bitState];

        current.mainLine.push({ x: timestamp, y: lineData.mainLine });
        current.uncertaintyLine.push({
            x: timestamp,
            y: lineData.uncertaintyLine,
        });
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
                const previousBitStates = this.previousBitStates[i];
                const hasEntry =
                    this.lineData[i].mainLine.length > 0 &&
                    this.previousBitStates[i];

                if (hasEntry && previousBitStates) {
                    const lastEntryIsNotForLastTimestamp =
                        this.latestTimestamp !==
                        this.lineData[i].mainLine[
                            this.lineData[i].mainLine.length - 1
                        ]?.x;

                    if (lastEntryIsNotForLastTimestamp) {
                        this.storeEntry(
                            this.latestTimestamp,
                            i,
                            previousBitStates
                        );
                    }
                }
            });
        }
    },

    getLineData() {
        this.addFinalEntries();

        return this.lineData;
    },
});
