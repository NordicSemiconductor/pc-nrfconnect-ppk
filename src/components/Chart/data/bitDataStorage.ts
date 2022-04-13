/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { numberOfDigitalChannels } from '../../../globals';
import {
    BitStateIndex,
    lineDataForBitState,
} from '../../../utils/bitConversion';
import { emptyArray } from './commonBitDataFunctions';
import {
    BitNumber,
    DigitalChannels,
    DigitalChannelStates,
    Timestamp,
} from './dataTypes';

export default () => ({
    lineData: [...Array(numberOfDigitalChannels)].map(
        () =>
            ({
                mainLine: emptyArray(),
                uncertaintyLine: emptyArray(),
            } as DigitalChannelStates)
    ),
    bitIndexes: new Array(numberOfDigitalChannels),
    previousBitStates: new Array(numberOfDigitalChannels),
    // TODO: Verify if this does not change behavior. Introduced declaration/initialization in outer body.
    digitalChannelsToCompute: new Array(numberOfDigitalChannels),
    latestTimestamp: undefined as Timestamp,

    /**
     *
     * @param {DigitalChannels} digitalChannelsToCompute array of the digital channels to compute
     * @returns {void} initialised bitDataStorage
     */
    initialise(digitalChannelsToCompute: DigitalChannels) {
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
