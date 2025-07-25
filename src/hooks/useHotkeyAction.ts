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

export const useHotkeyActions = (
    subscriptions: Array<{
        actionType: HotkeyActionType;
        handler: HotkeySubscriber;
    }>
) => {
    useEffect(() => {
        const unsubscribers = subscriptions.map(({ actionType, handler }) =>
            hotkeyEventManager.subscribe(actionType, handler)
        );

        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }, [subscriptions]);
};

export type { HotkeyEvent, HotkeySubscriber };
export { HotkeyActionType };
