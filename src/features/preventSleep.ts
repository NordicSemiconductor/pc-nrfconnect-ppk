/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { preventSleep } from '@nordicsemiconductor/pc-nrfconnect-shared';

let preventSleepId: number | undefined;

export async function startPreventSleep() {
    if (preventSleepId === undefined) {
        preventSleepId = await preventSleep.start();
    }
}

export function stopPreventSleep() {
    if (preventSleepId !== undefined) {
        preventSleep.end(preventSleepId);
        preventSleepId = undefined;
    }
}
