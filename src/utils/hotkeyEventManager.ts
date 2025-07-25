/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';

export enum HotkeyActionType {
    SELECT_ALL = 'SELECT_ALL',
    SELECT_NONE = 'SELECT_NONE',
    ZOOM_TO_SELECTION = 'ZOOM_TO_SELECTION',
}

export interface HotkeyEvent {
    type: HotkeyActionType;
    timestamp: number;
    payload?: unknown;
}

export type HotkeySubscriber = (event: HotkeyEvent) => boolean | void;

class HotkeyEventManager {
    private subscribers: Map<HotkeyActionType, Set<HotkeySubscriber>> =
        new Map();

    subscribe(
        actionType: HotkeyActionType,
        subscriber: HotkeySubscriber
    ): () => void {
        if (!this.subscribers.has(actionType)) {
            this.subscribers.set(actionType, new Set());
        }

        const subscribersSet = this.subscribers.get(actionType);
        if (subscribersSet) {
            subscribersSet.add(subscriber);
        }

        return () => {
            const currentSubscribers = this.subscribers.get(actionType);
            if (currentSubscribers) {
                currentSubscribers.delete(subscriber);
                if (currentSubscribers.size === 0) {
                    this.subscribers.delete(actionType);
                }
            }
        };
    }

    publish(actionType: HotkeyActionType, payload?: unknown): boolean {
        const event: HotkeyEvent = {
            type: actionType,
            timestamp: Date.now(),
            payload,
        };

        const subscribers = this.subscribers.get(actionType);
        if (!subscribers || subscribers.size === 0) {
            return false;
        }

        let handled = false;
        const subscriberArray = Array.from(subscribers);
        subscriberArray.forEach(subscriber => {
            try {
                const result = subscriber(event);
                if (result === true) {
                    handled = true;
                }
            } catch (error) {
                logger.error(
                    `Hotkey subscriber error for ${actionType}: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        });

        return handled;
    }

    getSubscriberCount(actionType: HotkeyActionType): number {
        return this.subscribers.get(actionType)?.size ?? 0;
    }

    clear(): void {
        this.subscribers.clear();
    }
}

export const hotkeyEventManager = new HotkeyEventManager();
