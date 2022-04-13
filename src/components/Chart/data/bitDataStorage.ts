/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { numberOfDigitalChannels } from '../../../globals';
import {
    BitState,
    BitStateIndex,
    lineDataForBitState,
} from '../../../utils/bitConversion';

type BitNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Timestamp = undefined | number;

type LineData = {
    timestamp: undefined | number;
    bitState: BitState;
};

/**
 * Returns array with length 4000
 * TODO: Describe why 4000 has been chosen
 * @returns {any} Something...
 */
const emptyArray = () =>
    [...Array(4000)].map(
        () =>
            ({
                timestamp: undefined,
                bitState: undefined,
            } as LineData)
    );

export default () => ({
    /**
     * LineData has
     */
    lineData: [...Array(numberOfDigitalChannels)].map(() => ({
        mainLine: emptyArray(),
        uncertaintyLine: emptyArray(),
    })),
    bitIndexes: new Array(numberOfDigitalChannels),
    previousBitStates: new Array(numberOfDigitalChannels),
    // TODO: Verify if this does not change behavior. Introduced declaration/initialization in outer body.
    digitalChannelsToCompute: new Array(numberOfDigitalChannels),
    latestTimestamp: undefined as Timestamp,

    /**
     *
     * @param {boolean[]} digitalChannelsToCompute array of the digital channels to compute
     * @returns {void} initialised bitDataStorage
     */
    initialise(digitalChannelsToCompute: boolean[]) {
        this.bitIndexes.fill(0);
        this.previousBitStates.fill(null);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
    },

    storeEntry(
        timestamp: Timestamp,
        bitNumber: BitNumber,
        bitState: BitStateIndex
    ) {
        const current = this.lineData[bitNumber];
        const bitIndex = this.bitIndexes[bitNumber];
        const lineData = lineDataForBitState[bitState];

        current.mainLine[bitIndex].timestamp = timestamp;
        current.mainLine[bitIndex].bitState = lineData.mainLine;

        current.uncertaintyLine[bitIndex].timestamp = timestamp;
        current.uncertaintyLine[bitIndex].bitState = lineData.uncertaintyLine;

        ++this.bitIndexes[bitNumber];
    },

    storeBit(
        timestamp: Timestamp,
        bitNumber: BitNumber,
        bitState: BitStateIndex
    ) {
        this.latestTimestamp = timestamp;

        const bitChanged = this.previousBitStates[bitNumber] !== bitState;
        if (bitChanged) {
            this.storeEntry(timestamp, bitNumber, bitState);

            this.previousBitStates[bitNumber] = bitState;
        }
    },

    addFinalEntries() {
        this.digitalChannelsToCompute.forEach(i => {
            const hasEntry = this.bitIndexes[i] > 0;
            const lastEntryIsNotForLastTimestamp =
                this.latestTimestamp !==
                this.lineData[i].mainLine[this.bitIndexes[i] - 1]?.timestamp;

            if (hasEntry && lastEntryIsNotForLastTimestamp) {
                this.storeEntry(
                    this.latestTimestamp,
                    i,
                    this.previousBitStates[i]
                );
            }
        });
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
