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

import { options, timestampToIndex, nbDigitalChannels } from '../../../globals';
import {
    averagedBitState,
    always0,
    always1,
    sometimes0And1,
} from '../../../utils/bitConversion';
import bitDataProcessor from './bitDataProcessor';

const emptyArray = () =>
    [...Array(4000)].map(() => ({ x: undefined, y: undefined }));

export default () => ({
    ampereLineData: emptyArray(),
    bitDataProcessor: bitDataProcessor(),
    bitStateAccumulator: new Array(nbDigitalChannels),

    process(begin, end, numberOfBits, len, windowDuration) {
        const { bits, data, index } = options;

        const originalIndexBegin = timestampToIndex(begin, index);
        const originalIndexEnd = timestampToIndex(end, index);
        const step = (originalIndexEnd - originalIndexBegin) / len;

        let mappedIndex = 0;
        let timestamp;

        this.bitDataProcessor.initialise(numberOfBits);

        for (
            let originalIndex = originalIndexBegin;
            mappedIndex < len + len;
            ++mappedIndex, originalIndex += step
        ) {
            timestamp = begin + windowDuration * (mappedIndex / (len + len));
            const k = Math.floor(originalIndex);
            const l = Math.floor(originalIndex + step);
            let min = Number.MAX_VALUE;
            let max = -Number.MAX_VALUE;
            this.bitStateAccumulator.fill(null);

            for (let n = k; n < l; ++n) {
                const ni = (n + data.length) % data.length;
                const v = data[ni];
                if (!Number.isNaN(v)) {
                    if (v > max) max = v;
                    if (v < min) min = v;

                    for (let i = 0; i < numberOfBits; ++i) {
                        const newBitState = averagedBitState(bits[ni], i);

                        if (this.bitStateAccumulator[i] === null) {
                            this.bitStateAccumulator[i] = newBitState;
                        } else if (
                            this.bitStateAccumulator[i] === always1 &&
                            newBitState !== always1
                        ) {
                            this.bitStateAccumulator[i] = sometimes0And1;
                        } else if (
                            this.bitStateAccumulator[i] === always0 &&
                            newBitState !== always0
                        ) {
                            this.bitStateAccumulator[i] = sometimes0And1;
                        }
                    }
                }
            }

            if (min > max) {
                min = undefined;
                max = undefined;
            }
            this.ampereLineData[mappedIndex].x = timestamp;
            this.ampereLineData[mappedIndex].y = min;
            ++mappedIndex;
            this.ampereLineData[mappedIndex].x = timestamp;
            this.ampereLineData[mappedIndex].y = max;

            if (min !== undefined) {
                for (let bitNumber = 0; bitNumber < numberOfBits; ++bitNumber) {
                    this.bitDataProcessor.processNextBit(
                        timestamp,
                        bitNumber,
                        this.bitStateAccumulator[bitNumber]
                    );
                }
            }
        }

        return {
            ampereLineData: this.ampereLineData.slice(0, mappedIndex),
            bitsLineData: this.bitDataProcessor.getLineData(),
        };
    },
});
