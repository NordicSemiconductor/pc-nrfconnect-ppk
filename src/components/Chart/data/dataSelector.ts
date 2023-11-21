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

        const bitDataProcessor =
            digitalChannelsToCompute.length > 0
                ? this.bitDataSelector
                : this.noOpBitDataProcessor;

        bitDataProcessor.initialise(digitalChannelsToCompute);

        let last;
        for (let n = 0; n <= data.current.length; n += 1) {
            const v = data.current[n];
            const timestamp =
                begin +
                (n * microSecondsPerSecond) /
                    DataManager().getSamplesPerSecond();
            this.ampereLineData[n].x = timestamp;

            if (n < data.current.length) {
                last = Number.isNaN(v) ? undefined : v;
            }

            if (removeZeroValues && last === 0) {
                last = NaN;
            }

            this.ampereLineData[n].y = last;

            if (!Number.isNaN(v) && data.bits) {
                bitDataProcessor.processBits(data.bits[n], timestamp);
            }
        }

        return {
            ampereLineData: this.ampereLineData.slice(0, data.current.length),
            bitsLineData: bitDataProcessor.getLineData(),
        };
    },
});
