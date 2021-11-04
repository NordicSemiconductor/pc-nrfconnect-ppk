/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */

import { nbDigitalChannels, options, timestampToIndex } from '../../../globals';
import bitDataAccumulator from './bitDataAccumulator';
import noOpBitDataProcessor from './noOpBitDataProcessor';

const emptyArray = () =>
    [...Array(4000)].map(() => ({ x: undefined, y: undefined }));

export default () => ({
    ampereLineData: emptyArray(),
    bitDataAccumulator: bitDataAccumulator(),
    noOpBitDataProcessor: noOpBitDataProcessor(),
    bitStateAccumulator: new Array(nbDigitalChannels),

    process(begin, end, digitalChannelsToCompute, len, windowDuration) {
        const { data, index } = options;
        const bitDataProcessor =
            digitalChannelsToCompute.length > 0
                ? this.bitDataAccumulator
                : this.noOpBitDataProcessor;

        const originalIndexBegin = timestampToIndex(begin, index);
        const originalIndexEnd = timestampToIndex(end, index);
        const step =
            len === 0 ? 0 : (originalIndexEnd - originalIndexBegin) / len;

        let mappedIndex = 0;

        bitDataProcessor.initialise(digitalChannelsToCompute);

        for (
            let originalIndex = originalIndexBegin;
            mappedIndex < len + len;
            ++mappedIndex, originalIndex += step
        ) {
            const timestamp =
                begin + windowDuration * (mappedIndex / (len + len));
            const k = Math.floor(originalIndex);
            const l = Math.floor(originalIndex + step);
            let min = Number.MAX_VALUE;
            let max = -Number.MAX_VALUE;

            for (let n = k; n < l; ++n) {
                const ni = (n + data.length) % data.length;
                const v = data[ni];
                if (!Number.isNaN(v)) {
                    if (v > max) max = v;
                    if (v < min) min = v;

                    bitDataProcessor.processBits(ni);
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
                bitDataProcessor.processAccumulatedBits(timestamp);
            }
        }

        return {
            ampereLineData: this.ampereLineData.slice(0, mappedIndex),
            bitsLineData: bitDataProcessor.getLineData(),
        };
    },
});
