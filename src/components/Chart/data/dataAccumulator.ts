/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { DataManager, numberOfDigitalChannels } from '../../../globals';
import bitDataAccumulator, { BitDataAccumulator } from './bitDataAccumulator';
import { createEmptyArrayWithAmpereState } from './commonBitDataFunctions';
import { AmpereState, DigitalChannelStates } from './dataTypes';
import noOpBitDataProcessor from './noOpBitDataProcessor';

export const calcStats = (begin?: null | number, end?: null | number) => {
    if (begin == null || end == null) {
        return null;
    }

    if (end < begin) {
        [begin, end] = [end, begin];
    }

    const data = DataManager().getData(
        begin,
        Math.min(end, DataManager().getTimestamp())
    );

    let sum = 0;
    let len = 0;
    let max;

    for (let n = 0; n <= data.length; n += 1) {
        const k = (n + data.length) % data.length;
        const v = data[k];
        if (!Number.isNaN(v)) {
            if (max === undefined || v > max) {
                max = v;
                sum += v;
                len += 1;
            }
        }
    }
    return {
        average: sum / (len || 1),
        max: max ?? 0,
        delta: end - begin,
    };
};

export interface DataAccumulator {
    ampereLineData: AmpereState[];
    bitDataAccumulator: BitDataAccumulator;
    noOpBitDataProcessor: BitDataAccumulator;
    bitStateAccumulator: number[];

    process: (
        begin: number,
        end: number,
        digitalChannelsToCompute: number[],
        removeZeroValues: boolean,
        len: number,
        windowDuration: number
    ) => {
        ampereLineData: AmpereState[];
        bitsLineData: DigitalChannelStates[];
    };
}

export type DataAccumulatorInitialiser = () => DataAccumulator;
export default (): DataAccumulator => ({
    ampereLineData: createEmptyArrayWithAmpereState(),
    bitDataAccumulator: bitDataAccumulator(),
    /* @ts-expect-error -- Should not really escape this error */
    noOpBitDataProcessor: noOpBitDataProcessor(),
    bitStateAccumulator: new Array(numberOfDigitalChannels),

    process(
        begin,
        end,
        digitalChannelsToCompute,
        removeZeroValues,
        maxNumberOfPoints,
        windowDuration
    ) {
        const bitDataProcessor =
            digitalChannelsToCompute.length > 0
                ? this.bitDataAccumulator
                : this.noOpBitDataProcessor;

        const data = DataManager().getData(begin, end);
        const bits = DataManager().getDataBits(begin, end);

        const numberOfGroupedPoints =
            maxNumberOfPoints === 0 ? 0 : data.length / maxNumberOfPoints;

        let mappedIndex = 0;

        bitDataProcessor.initialise(digitalChannelsToCompute);

        for (
            let originalIndex = 0;
            mappedIndex < 2 * maxNumberOfPoints;
            mappedIndex += 1, originalIndex += numberOfGroupedPoints
        ) {
            const timestamp =
                begin +
                windowDuration *
                    (mappedIndex / (maxNumberOfPoints + maxNumberOfPoints));
            const k = Math.floor(originalIndex);
            const l = Math.floor(originalIndex + numberOfGroupedPoints);
            let min: number | undefined = Number.MAX_VALUE;
            let max: number | undefined = -Number.MAX_VALUE;

            for (let n = k; n < l; n += 1) {
                let v = data[n] ?? NaN;

                if (removeZeroValues && v === 0) {
                    v = NaN;
                }

                if (!Number.isNaN(v)) {
                    if (v > max) max = v;
                    if (v < min) min = v;

                    if (bits && n < bits.length) {
                        bitDataProcessor.processBits(bits[n]);
                    }
                }
            }

            if (min > max) {
                min = undefined;
                max = undefined;
            }

            this.ampereLineData[mappedIndex].x = timestamp;
            this.ampereLineData[mappedIndex].y = min;
            mappedIndex += 1;
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
