/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Chart, CoreScaleOptions, Scale } from 'chart.js';
import { logger } from 'pc-nrfconnect-shared';

import { getSamplesPerSecond } from '../../../globals';
import {
    MAX_WINDOW_DURATION,
    MIN_WINDOW_DURATION,
} from '../../../slices/chartSlice';

type ZoomPanCallback = (
    beginX?: number,
    endX?: number,
    beginY?: null | number,
    endY?: null | number
) => void;

function isCanvasElement(
    element: EventTarget | null
): element is HTMLCanvasElement {
    return element instanceof HTMLCanvasElement;
}

const wheelZoomFactor = 1.25;

const isTrackPad = (event: WheelEvent) => {
    if (event.deltaX) return true;
    // @ts-expect-error TODO: must fix in order to keep it compatible.
    if (event.wheelDeltaY) {
        // @ts-expect-error TODO: must fix in order to keep it compatible.
        if (event.wheelDeltaY === event.deltaY * -3) {
            return true;
        }
    } else if (event.deltaMode === 0) {
        return true;
    }
    return false;
};

const zoomAtOrigin = (
    callback: ZoomPanCallback,
    pX: number,
    factorX: number,
    xMin: number,
    xMax: number,
    pY?: number,
    factorY?: number,
    yMin?: number,
    yMax?: number
) => {
    const zX = Math.max(factorX, 0.1);
    const newMinX = pX - (pX - xMin) / zX;
    const newMaxX = pX + (xMax - pX) / zX;
    if (pY !== undefined) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const zY = Math.max(factorY!, 0.1);
        const newMinY = pY - (pY - yMin!) / zY;
        const newMaxY = pY + (yMax! - pY) / zY;
        callback(newMinX, newMaxX, newMinY, newMaxY);
        return;
    }
    callback(newMinX, newMaxX, null, null);
};

let processingWheelEvents = false;
let wheelEventToProcess: {
    event: WheelEvent;
    scales: { [key: string]: Scale<CoreScaleOptions> };
    callback?: ZoomPanCallback;
    sampleFrequency?: number;
};

const processWheelEvents = () => {
    processingWheelEvents = false;

    const { event, scales, callback } = wheelEventToProcess;

    if (!callback) {
        return;
    }

    const { clientX, clientY, deltaX, deltaY } = event;

    if (!isCanvasElement(event.target)) return;

    const { left: xOffset, top: yOffset } =
        event.target.getBoundingClientRect();

    const isTrackPadEvent = isTrackPad(event);
    const isTrackpadPan = isTrackPadEvent && !event.shiftKey;
    const isTrackpadZoom = isTrackPadEvent && event.shiftKey;

    const { xScale, yScale } = scales;
    const { min: xMin, max: xMax, width } = scales.xScale;
    const { min: yMin, max: yMax, height } = scales.yScale;

    if (isTrackpadZoom) {
        const pX =
            xMin + (xMax - xMin) * ((clientX - xOffset - xScale.left) / width);
        const pY =
            yMax + (yMin - yMax) * ((clientY - yOffset - yScale.top) / height);
        const fx = 1.01 ** deltaX;
        const fy = 1.01 ** deltaY;
        zoomAtOrigin(callback, pX, fx, xMin, xMax, pY, fy, yMin, yMax);
    } else if (isTrackpadPan) {
        const fx = (xMax - xMin) / width;
        const fy = (yMin - yMax) / height;
        const dx = fx * deltaX;
        const dy = fy * deltaY;
        callback(xMin + dx, xMax + dx, yMin + dy, yMax + dy);
    } else {
        let z = 0;
        if (deltaY < 0) {
            z = wheelZoomFactor;
        } else if (deltaY > 0) {
            z = 1 / wheelZoomFactor;
        } else {
            return;
        }
        const p = xScale.getValueForPixel(clientX - xOffset);
        if (p == null) {
            // As xScale.getValueForPixel may return undefined, we need to handle it appropriately.
            logger.debug(
                'zoomPan.ts-->processWheelEvents: getValueForPixel returned undefined.'
            );
            return;
        }

        const windowWidth = xMax - xMin;
        const samplesPerSecond = getSamplesPerSecond();

        // On zoom out: do not attempt to adjust after reaching max zoom out.
        if (z < 1 && windowWidth >= MAX_WINDOW_DURATION / samplesPerSecond) {
            return;
        }

        // On zoom in: do not attempt to adjust after reaching max zoom in.
        if (z > 1 && windowWidth <= MIN_WINDOW_DURATION / samplesPerSecond) {
            return;
        }

        zoomAtOrigin(callback, p, z, xMin, Math.ceil(xMax));
    }
};

let processingPointerMoveEvents = false;

interface DragStart {
    type: string;
    pX: number;
    pY: number;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    moved?: boolean;
}

let pointerMoveEventToProcess: {
    event: PointerEvent;
    dragStart: DragStart;
    scales: { [key: string]: Scale<CoreScaleOptions> };
    callback?: ZoomPanCallback;
};

const processPointerMoveEvents = () => {
    processingPointerMoveEvents = false;

    const { event, dragStart, scales, callback } = pointerMoveEventToProcess;

    if (!callback) {
        return;
    }

    if (!isCanvasElement(event.target)) return;

    const { clientX, clientY } = event;
    const { left: xOffset, top: yOffset } =
        event.target.getBoundingClientRect();

    const { xMin, xMax, yMin, yMax, pX, pY } = dragStart;
    const { xScale, yScale } = scales;
    const qX =
        xMin +
        (xMax - xMin) * ((clientX - xOffset - xScale.left) / xScale.width);
    const qY =
        yMin +
        (yMax - yMin) * ((clientY - yOffset - yScale.top) / yScale.height);

    if (dragStart.type === 'pan') {
        callback(xMin + (pX - qX), xMax + (pX - qX), null, null);
        return;
    }

    const zX = (wheelZoomFactor * 4) ** ((qX - pX) / (xMax - xMin));
    const zY = (wheelZoomFactor * 4) ** ((qY - pY) / (yMax - yMin));
    zoomAtOrigin(callback, pX, zX, xMin, xMax, pY, zY, yMin, yMax);
};

interface ZoomPan {
    pointerUpHandler?: (event: PointerEvent) => void;
    pointerDownHandler?: (event: PointerEvent) => void;
    pointerMoveHandler?: (event: PointerEvent) => void;
    wheelHandler?: (event: WheelEvent) => void;
    callback?: ZoomPanCallback;
    dragStart?: DragStart | null;
}

export default {
    id: 'zoomPan',

    beforeInit(
        chart: Chart<'line'> & { zoomPan?: ZoomPan; sampleFrequency?: number }
    ) {
        const zoomPan: ZoomPan = {};
        chart.zoomPan = zoomPan;

        // The following changes have to be properly tested.
        const { canvas } = chart.ctx;

        zoomPan.wheelHandler = (event: WheelEvent) => {
            wheelEventToProcess = {
                event,
                scales: chart.scales,
                callback: zoomPan.callback ?? undefined,
                sampleFrequency: chart.sampleFrequency,
            };

            if (!processingWheelEvents) {
                processingWheelEvents = true;
                requestAnimationFrame(processWheelEvents);
            }
        };
        canvas.addEventListener('wheel', zoomPan.wheelHandler);

        zoomPan.pointerDownHandler = event => {
            if (!zoomPan.callback) {
                return;
            }
            if (event.button === 1) {
                // reset min-max window
                zoomPan.callback();
                return;
            }
            if (event.shiftKey) {
                return;
            }

            if (!isCanvasElement(event.target)) {
                return;
            }

            if (event.button === 0 || event.button === 2) {
                const type = event.button === 2 ? 'zoom' : 'pan';
                const { xScale, yScale } = chart.scales;
                const { min: xMin, max: xMax } = xScale;
                const { max: yMin, min: yMax } = yScale;
                const { left: xOffset, top: yOffset } =
                    event.target.getBoundingClientRect();
                const pX =
                    xMin +
                    (xMax - xMin) *
                        ((event.clientX - xOffset - xScale.left) /
                            xScale.width);
                const pY =
                    yMin +
                    (yMax - yMin) *
                        ((event.clientY - yOffset - yScale.top) /
                            yScale.height);

                zoomPan.dragStart = {
                    type,
                    pX,
                    pY,
                    xMin,
                    xMax,
                    yMin,
                    yMax,
                };
            }
            event.preventDefault();
        };
        canvas.addEventListener('pointerdown', zoomPan.pointerDownHandler);

        zoomPan.pointerMoveHandler = event => {
            if (!zoomPan.dragStart) {
                return;
            }

            if (!isCanvasElement(event.target)) {
                return;
            }

            event.target.setPointerCapture(event.pointerId);
            zoomPan.dragStart.moved = true;

            pointerMoveEventToProcess = {
                event,
                dragStart: { ...zoomPan.dragStart },
                scales: chart.scales,
                callback: zoomPan.callback,
            };

            if (!processingPointerMoveEvents) {
                processingPointerMoveEvents = true;
                requestAnimationFrame(processPointerMoveEvents);
            }
        };
        canvas.addEventListener(
            'pointermove',
            zoomPan.pointerMoveHandler,
            false
        );

        zoomPan.pointerUpHandler = () => {
            if (zoomPan.callback == null) {
                logger.error(
                    'zoomPan-->zoomPan.pointerUpHandler: no callback defined'
                );
                return;
            }

            if (
                zoomPan.dragStart &&
                zoomPan.dragStart.type === 'zoom' &&
                !zoomPan.dragStart.moved
            ) {
                zoomPan.callback();
            }
            zoomPan.dragStart = null;
        };
        canvas.addEventListener('pointerup', zoomPan.pointerUpHandler, false);
        canvas.addEventListener(
            'pointerleave',
            zoomPan.pointerUpHandler,
            false
        );
    },
};
