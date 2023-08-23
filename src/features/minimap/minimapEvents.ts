/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { EventEmitter } from 'events';

import { options } from '../../globals';

export const eventEmitter = new EventEmitter();
export const minimapEvents = (() => {
    let intervalId: NodeJS.Timer;
    return {
        startInterval: () => {
            const interval = options.samplingTime * 1_000;
            const totalSamplingTime =
                options.samplingTime * options.data.length;
            intervalId = setInterval(() => {
                eventEmitter.emit('updateMinimap');
            }, interval);

            setTimeout(() => {
                clearInterval(intervalId);
            }, totalSamplingTime);
        },
        stop: () => {
            clearInterval(intervalId);
            eventEmitter.emit('updateMinimap');
        },
        update: () => {
            eventEmitter.emit('updateMinimap');
        },
        clear: () => {
            eventEmitter.emit('clearMinimap');
        },
    };
})();
