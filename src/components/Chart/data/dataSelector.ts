/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { DataManager, microSecondsPerSecond } from '../../../globals';
import { BitDataAccumulator } from './bitDataAccumulator';
import bitDataSelector, { BitDataSelector } from './bitDataSelector';
import { createEmptyArrayWithAmpereState } from './commonBitDataFunctions';
import { AmpereState, DigitalChannelStates } from './dataTypes';
import noOpBitDataProcessor from './noOpBitDataProcessor';

export interface DataSelector {
    ampereLineData: AmpereState[];
    bitDataSelector: BitDataSelector;
    noOpBitDataProcessor: BitDataAccumulator;

    process: (
        begin: number,
        end: number,
        digitalChannelsToCompute: number[],
        removeZeroValues: boolean
    ) => {
        ampereLineData: AmpereState[];
        bitsLineData: DigitalChannelStates[];
    };
}

export type DataSelectorInitialiser = () => DataSelector;
export default (): DataSelector => ({
    ampereLineData: createEmptyArrayWithAmpereState(),
    bitDataSelector: bitDataSelector(),
    /* @ts-expect-error -- Should not really escape this error */
    noOpBitDataProcessor: noOpBitDataProcessor(),

    process(
        begin: number,
        end: number,
        digitalChannelsToCompute: number[],
        removeZeroValues: boolean
    ) {
        const data = DataManager().getData(begin, end);
        const bits = DataManager().getDataBits(begin, end);

        const bitDataProcessor =
            digitalChannelsToCompute.length > 0
                ? this.bitDataSelector
                : this.noOpBitDataProcessor;

        let mappedIndex = 0;

        bitDataProcessor.initialise(digitalChannelsToCompute);

        let last;
        for (let n = 0; n <= data.length; mappedIndex += 1, n += 1) {
            const k = (n + data.length) % data.length;
            const v = data[k];
            const timestamp =
                begin +
                (n * microSecondsPerSecond) /
                    DataManager().getSamplesPerSecond();
            this.ampereLineData[mappedIndex].x = timestamp;

            if (n < data.length) {
                last = Number.isNaN(v) ? undefined : v;
            }

            if (removeZeroValues && last === 0) {
                last = NaN;
            }

            this.ampereLineData[mappedIndex].y = last;

            if (!Number.isNaN(v) && bits) {
                bitDataProcessor.processBits(bits[k], timestamp);
            }
        }

        return {
            ampereLineData: this.ampereLineData.slice(0, mappedIndex),
            bitsLineData: bitDataProcessor.getLineData(),
        };
    },
});
