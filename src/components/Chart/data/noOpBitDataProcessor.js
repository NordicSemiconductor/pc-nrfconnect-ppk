/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { numberOfDigitalChannels } from '../../../globals';

const emptyResult = [...Array(numberOfDigitalChannels)].map(() => ({
    mainLine: [],
    uncertaintyLine: [],
}));

export default () => ({
    initialise() {},
    processBits() {},
    processAccumulatedBits() {},
    getLineData: () => emptyResult,
});
