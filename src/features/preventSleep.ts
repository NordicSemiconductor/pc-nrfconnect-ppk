/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { ipcRenderer } from 'electron';

let preventSleepId: number | undefined;

export async function startPreventSleep() {
    if (preventSleepId === undefined) {
        preventSleepId = await ipcRenderer.invoke('prevent-sleep:start');
    }
}

export function stopPreventSleep() {
    if (preventSleepId !== undefined) {
        ipcRenderer.send('prevent-sleep:end', preventSleepId);
        preventSleepId = undefined;
    }
}
