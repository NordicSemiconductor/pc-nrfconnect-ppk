/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { nbDigitalChannels } from '../../../globals';
import { lineDataForBitState } from '../../../utils/bitConversion';

const emptyArray = () =>
    [...Array(4000)].map(() => ({ x: undefined, y: undefined }));

export default () => ({
    lineData: [...Array(nbDigitalChannels)].map(() => ({
        mainLine: emptyArray(),
        uncertaintyLine: emptyArray(),
    })),
    bitIndexes: new Array(nbDigitalChannels),
    previousBitStates: new Array(nbDigitalChannels),

    initialise(digitalChannelsToCompute) {
        this.bitIndexes.fill(0);
        this.previousBitStates.fill(null);
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

        ++this.bitIndexes[bitNumber];
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
