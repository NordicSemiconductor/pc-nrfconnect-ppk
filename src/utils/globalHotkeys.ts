/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { useHotKey } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { HotkeyActionType, hotkeyEventManager } from './hotkeyEventManager';

export const useGlobalHotkeys = () => {
    useHotKey({
        hotKey: 'alt+a',
        title: 'Select all',
        isGlobal: false,
        action: () => hotkeyEventManager.publish(HotkeyActionType.SELECT_ALL),
    });

    useHotKey({
        hotKey: 'esc',
        title: 'Select none',
        isGlobal: false,
        action: () => {
            hotkeyEventManager.publish(HotkeyActionType.SELECT_NONE);
        },
    });

    useHotKey({
        hotKey: 'alt+z',
        title: 'Zoom to selected area',
        isGlobal: false,
        action: () =>
            hotkeyEventManager.publish(HotkeyActionType.ZOOM_TO_SELECTION),
    });
};
