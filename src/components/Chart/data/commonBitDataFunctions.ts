/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { AmpereState, DigitalChannelState } from './dataTypes';

/**
 * @returns {DigitalChannelState[]} Array with length 4000, containing the BitState for the given timestamp,
 * where timestamp is the equivalent x coordinate and bitState is a BitState represented on the y-axis.
 *
 * The value <4000> has been chosen as a maximum or sufficient number of pixels to be available in the window at any given time.
 * The number of pixels displayed on the screen is dynamically scaled by averaging over several samples when the user zooms out.
 */
export const createEmptyArrayWithDigitalChannelStates = () =>
    [...Array(4000)].map(
        () =>
            ({
                x: undefined,
                y: undefined,
            } as DigitalChannelState)
    );

/**
 * @returns {AmpereState[]} Array with length 4000, containing the AmpereState for the given timestamp,
 * where timestamp is the equivalent x coordinate and ampereState is a number represented on the y-axis.
 *
 * The value <4000> has been chosen as a maximum or sufficient number of pixels to be available in the window at any given time.
 * The number of pixels displayed on the screen is dynamically scaled by averaging over several samples when the user zooms out.
 */
export const createEmptyArrayWithAmpereState = () =>
    [...Array(4000)].map(
        () =>
            ({
                x: undefined,
                y: undefined,
            } as AmpereState)
    );
