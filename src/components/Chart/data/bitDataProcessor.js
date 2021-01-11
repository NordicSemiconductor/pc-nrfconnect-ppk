/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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

    initialise(numberOfBits) {
        this.bitIndexes.fill(0);
        this.previousBitStates.fill(null);
        this.numberOfBits = numberOfBits;
    },

    storeEntry(timestamp, bitNumber, bitState) {
        const current = this.lineData[bitNumber];
        const index = this.bitIndexes[bitNumber];
        const lineData = lineDataForBitState[bitState];

        current.mainLine[index].x = timestamp;
        current.mainLine[index].y = lineData.mainLine;

        current.uncertaintyLine[index].x = timestamp;
        current.uncertaintyLine[index].y = lineData.uncertaintyLine;

        ++this.bitIndexes[bitNumber];
    },

    processNextBit(timestamp, bitNumber, bitState) {
        this.latestTimestamp = timestamp;

        const bitChanged = this.previousBitStates[bitNumber] !== bitState;
        if (bitChanged) {
            this.storeEntry(timestamp, bitNumber, bitState);

            this.previousBitStates[bitNumber] = bitState;
        }
    },

    addFinalEntries() {
        for (let i = 0; i < this.numberOfBits; ++i) {
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
