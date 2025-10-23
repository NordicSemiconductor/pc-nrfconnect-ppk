/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { EventEmitter } from 'events';

export enum HotkeyActionType {
    SELECT_ALL = 'SELECT_ALL',
    SELECT_NONE = 'SELECT_NONE',
    ZOOM_TO_SELECTION = 'ZOOM_TO_SELECTION',
    TOGGLE_POWER = 'TOGGLE_POWER',
}

export interface HotkeyEvent {
    type: HotkeyActionType;
    timestamp: number;
    payload?: unknown;
}

export type HotkeySubscriber = (event: HotkeyEvent) => unknown;

class HotkeyEventManager extends EventEmitter {
    subscribe(
        actionType: HotkeyActionType,
        subscriber: HotkeySubscriber,
    ): () => void {
        this.on(actionType, subscriber);
        return () => this.off(actionType, subscriber);
    }

    publish(actionType: HotkeyActionType, payload?: unknown) {
        const event: HotkeyEvent = {
            type: actionType,
            timestamp: Date.now(),
            payload,
        };

        this.emit(actionType, event);
    }
}

export const hotkeyEventManager = new HotkeyEventManager();
