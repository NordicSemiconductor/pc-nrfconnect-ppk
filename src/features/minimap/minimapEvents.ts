/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { EventEmitter } from 'events';

import { options } from '../../globals';

export const eventEmitter = new EventEmitter();
export const minimapEvents = (() => {
    let intervalId: NodeJS.Timeout;
    return {
        startInterval: () => {
            const THREE_SECONDS_IN_MS = 3000;
            const interval = THREE_SECONDS_IN_MS;
            const totalSamplingTime =
                (options.samplingTime / 1000) * options.data.length;
            intervalId = setInterval(() => {
                eventEmitter.emit('updateMinimap');
            }, interval);

            if (totalSamplingTime < 2_147_483_647) {
                // setTimeout is restricted to 32-bit value
                // Just drop the clearInterval if the total sampling time is more than that,
                // and trust that it will be cleared by either stop or clear.
                setTimeout(() => {
                    clearInterval(intervalId);
                }, totalSamplingTime);
            }
        },
        stop: () => {
            clearInterval(intervalId);
            eventEmitter.emit('updateMinimap');
        },
        update: () => {
            eventEmitter.emit('updateMinimap');
        },
        clear: () => {
            clearInterval(intervalId);
            eventEmitter.emit('clearMinimap');
        },
    };
})();
