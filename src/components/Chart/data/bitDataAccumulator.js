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

import bitDataStorage from './bitDataStorage';
import { nbDigitalChannels, options } from '../../../globals';
import {
    always0,
    always1,
    averagedBitState,
    sometimes0And1,
} from '../../../utils/bitConversion';

export default () => ({
    bitDataStorage: bitDataStorage(),
    accumulator: new Array(nbDigitalChannels),

    initialise(digitalChannelsToCompute) {
        this.bitDataStorage.initialise(digitalChannelsToCompute);
        this.digitalChannelsToCompute = digitalChannelsToCompute;
        this.accumulator.fill(null);
    },

    processBits(bitIndex) {
        const bits = options.bits[bitIndex];

        this.digitalChannelsToCompute.forEach(i => {
            const bitState = averagedBitState(bits, i);

            if (this.accumulator[i] === null) {
                this.accumulator[i] = bitState;
            } else if (
                (this.accumulator[i] === always1 && bitState !== always1) ||
                (this.accumulator[i] === always0 && bitState !== always0)
            ) {
                this.accumulator[i] = sometimes0And1;
            }
        });
    },

    processAccumulatedBits(timestamp) {
        this.digitalChannelsToCompute.forEach(i => {
            this.bitDataStorage.storeBit(timestamp, i, this.accumulator[i]);
        });

        this.accumulator.fill(null);
    },

    getLineData() {
        return this.bitDataStorage.getLineData();
    },
});
