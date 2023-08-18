/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export function isCanvasElement(
    element: EventTarget | null
): element is HTMLCanvasElement {
    return element instanceof HTMLCanvasElement;
}
