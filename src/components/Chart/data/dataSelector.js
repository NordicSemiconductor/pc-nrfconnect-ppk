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
/* eslint no-bitwise: off */
/* eslint no-plusplus: off */

import { options, timestampToIndex, nbDigitalChannels } from '../../../globals';

const emptyArray = () =>
    [...Array(4000)].map(() => ({ x: undefined, y: undefined }));

export default () => ({
    lineData: emptyArray(),
    bitsData: [...Array(nbDigitalChannels)].map(() => emptyArray()),
    bitIndexes: new Array(nbDigitalChannels),
    lastBits: new Array(nbDigitalChannels),

    process(begin, end, numberOfBits) {
        const { bits, data, index } = options;

        const originalIndexBegin = timestampToIndex(begin, index);
        const originalIndexEnd = timestampToIndex(end, index);

        let mappedIndex = 0;
        this.bitIndexes.fill(0);

        for (let i = 0; i < numberOfBits; ++i) {
            this.bitsData[i][0] = { x: undefined, y: undefined };
        }

        this.lastBits.fill(undefined);
        let last;
        const originalIndexBeginFloored = Math.floor(originalIndexBegin);
        const originalIndexEndCeiled = Math.ceil(originalIndexEnd);
        for (
            let n = originalIndexBeginFloored;
            n <= originalIndexEndCeiled;
            ++mappedIndex, ++n
        ) {
            const k = (n + data.length) % data.length;
            const v = data[k];
            const timestamp =
                begin +
                ((n - originalIndexBegin) * 1e6) / options.samplesPerSecond;
            this.lineData[mappedIndex].x = timestamp;
            if (n < originalIndexEndCeiled) {
                last = Number.isNaN(v) ? undefined : v;
            }
            this.lineData[mappedIndex].y = last;

            for (let i = 0; i < numberOfBits; ++i) {
                const y = Number.isNaN(v)
                    ? undefined
                    : (((bits[k] >> i) & 1) - 0.5) * 0.8;
                this.bitsData[i][this.bitIndexes[i]].x = timestamp;
                if (n === originalIndexEndCeiled) {
                    this.bitsData[i][this.bitIndexes[i]].y = this.lastBits[i];
                    ++this.bitIndexes[i];
                } else if (
                    (this.bitsData[i][this.bitIndexes[i] - 1] || {}).y !== y
                ) {
                    this.bitsData[i][this.bitIndexes[i]].y = y;
                    this.lastBits[i] = y;
                    ++this.bitIndexes[i];
                }
            }
        }

        return [
            this.lineData.slice(0, mappedIndex),
            this.bitsData.map((bitData, i) =>
                bitData.slice(0, this.bitIndexes[i])
            ),
        ];
    },
});
