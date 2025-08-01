/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { useEffect } from 'react';

import {
    HotkeyActionType,
    HotkeyEvent,
    hotkeyEventManager,
    HotkeySubscriber,
} from '../utils/hotkeyEventManager';

export const useHotkeyAction = (
    actionType: HotkeyActionType,
    handler: HotkeySubscriber
) => {
    useEffect(() => {
        const unsubscribe = hotkeyEventManager.subscribe(actionType, handler);
        return unsubscribe;
    }, [actionType, handler]);
};

export type { HotkeyEvent, HotkeySubscriber };
export { HotkeyActionType };
