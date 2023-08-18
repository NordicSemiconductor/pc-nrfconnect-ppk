/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { numberOfDigitalChannels } from '../../../globals';
import type { BitDataAccumulator } from './bitDataAccumulator';

/**
 * Initialise an empty result object with mainLine and uncertaintyLine.
 */
const emptyResult = [...Array(numberOfDigitalChannels)].map(() => ({
    mainLine: [],
    uncertaintyLine: [],
}));

export default (): Partial<BitDataAccumulator> => ({
    initialise() {},
    processBits() {},
    processAccumulatedBits() {},
    getLineData: () => emptyResult,
});
