/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { nbDigitalChannels } from '../../../globals';

const emptyResult = [...Array(nbDigitalChannels)].map(() => ({
    mainLine: [],
    uncertaintyLine: [],
}));

export default () => ({
    initialise() {},
    processBits() {},
    processAccumulatedBits() {},
    getLineData: () => emptyResult,
});
