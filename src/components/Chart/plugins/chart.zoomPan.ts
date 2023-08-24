/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { CoreScaleOptions, Plugin, Scale } from 'chart.js';
import { logger } from 'pc-nrfconnect-shared';

import { getSamplesPerSecond, options } from '../../../globals';
import {
    MAX_WINDOW_DURATION,
    MIN_WINDOW_DURATION,
} from '../../../slices/chartSlice';
import type { AmpereChartJS } from '../AmpereChart';
import { isCanvasElement } from './utility';

type ZoomPanCallback = (
    beginX?: number,
    endX?: number,
    beginY?: null | number,
    endY?: null | number
) => void;

export interface ZoomPan {
    pointerUpHandler?: (event: PointerEvent) => void;
    pointerDownHandler?: (event: PointerEvent) => void;
    pointerMoveHandler?: (event: PointerEvent) => void;
    wheelHandler?: (event: WheelEvent) => void;
    zoomPanCallback?: ZoomPanCallback;
    dragStart?: DragStart | null;
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
    zoomPanCallback: ZoomPanCallback,
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
    let newMinX = Math.max(pX - (pX - xMin) / zX, 0);
    let newMaxX = pX + (xMax - pX) / zX;

    if (zX > 1 && newMaxX > options.timestamp) {
        // If user have zoomed-out beyond the span of the sample, and try to zoom-back in,
        // make sure that the zoom-in will zoom-in on the sample, until the window spans
        // the entire sample or less.
        const width = newMaxX - newMinX;
        newMinX = 0;
        newMaxX = width;
    }

    if (zX < 1 && newMaxX > options.timestamp) {
        // On zoom-out, if the window moves outside of the span of the sample,
        // make sure that the window will first span the entire sample, before
        // it can move outside of the sample. This is only possible if the span
        // of the sample is less than MAX_WINDOW_DURATION.
        const width = newMaxX - newMinX;
        newMaxX = options.timestamp;
        newMinX = newMaxX - width;
        if (newMinX < 0) {
            newMinX = 0;
            newMaxX = width;
        }
    }

    if (pY !== undefined) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const zY = Math.max(factorY!, 0.1);
        const newMinY = pY - (pY - yMin!) / zY;
        const newMaxY = pY + (yMax! - pY) / zY;
        zoomPanCallback(newMinX, newMaxX, newMinY, newMaxY);
        return;
    }
    zoomPanCallback(newMinX, newMaxX, null, null);
};

let processingWheelEvents = false;
let wheelEventToProcess: {
    event: WheelEvent;
    scales: { [key: string]: Scale<CoreScaleOptions> };
    zoomPanCallback?: ZoomPanCallback;
    sampleFrequency?: number;
};

const processWheelEvents = () => {
    processingWheelEvents = false;

    const { event, scales, zoomPanCallback } = wheelEventToProcess;

    if (!zoomPanCallback) {
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
        zoomAtOrigin(zoomPanCallback, pX, fx, xMin, xMax, pY, fy, yMin, yMax);
    } else if (isTrackpadPan) {
        const fx = (xMax - xMin) / width;
        const fy = (yMin - yMax) / height;
        const dx = fx * deltaX;
        const dy = fy * deltaY;
        zoomPanCallback(xMin + dx, xMax + dx, yMin + dy, yMax + dy);
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

        zoomAtOrigin(zoomPanCallback, p, z, xMin, Math.ceil(xMax));
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
    zoomPanCallback?: ZoomPanCallback;
};

const processPointerMoveEvents = () => {
    processingPointerMoveEvents = false;

    const { event, dragStart, scales, zoomPanCallback } =
        pointerMoveEventToProcess;

    if (!zoomPanCallback) {
        return;
    }

    if (!isCanvasElement(event.target)) return;

    const { clientX, clientY } = event;
    const { left: xOffset, top: yOffset } =
        event.target.getBoundingClientRect();

    const {
        xMin: xOriginStart,
        xMax: xOriginEnd,
        yMin,
        yMax,
        pX,
        pY,
    } = dragStart;
    const { xScale, yScale } = scales;

    const originalWidth = xOriginEnd - xOriginStart;

    const qX =
        xOriginStart +
        (xOriginEnd - xOriginStart) *
            ((clientX - xOffset - xScale.left) / xScale.width);
    const qY =
        yMin +
        (yMax - yMin) * ((clientY - yOffset - yScale.top) / yScale.height);

    if (dragStart.type === 'pan') {
        let xNewStart = xOriginStart + (pX - qX);
        let xNewEnd = xOriginEnd + (pX - qX);

        if (xNewEnd > options.timestamp) {
            if (xNewStart === 0) {
                return;
            }

            xNewEnd = options.timestamp;
            xNewStart = xNewEnd - originalWidth;
        }

        if (xNewStart < 0) {
            // This means that user pans to the left beyond 0
            // case 5, 6, 10
            xNewStart = 0;
            xNewEnd = originalWidth;
        }

        zoomPanCallback(xNewStart, xNewEnd, null, null);
        return;
    }

    const zX =
        (wheelZoomFactor * 4) ** ((qX - pX) / (xOriginEnd - xOriginStart));
    const zY = (wheelZoomFactor * 4) ** ((qY - pY) / (yMax - yMin));

    // TODO: DEAD CODE?
    zoomAtOrigin(
        zoomPanCallback,
        pX,
        zX,
        xOriginStart,
        xOriginEnd,
        pY,
        zY,
        yMin,
        yMax
    );
};

const plugin: Plugin<'line'> = {
    id: 'zoomPan',

    beforeInit(chart: AmpereChartJS) {
        const zoomPan: ZoomPan = {};
        chart.zoomPan = zoomPan;

        const { canvas } = chart.ctx;

        zoomPan.wheelHandler = event => {
            wheelEventToProcess = {
                event,
                scales: chart.scales,
                zoomPanCallback: zoomPan.zoomPanCallback ?? undefined,
                sampleFrequency: chart.sampleFrequency,
            };

            if (!processingWheelEvents) {
                processingWheelEvents = true;
                requestAnimationFrame(processWheelEvents);
            }
        };
        canvas.addEventListener('wheel', zoomPan.wheelHandler);

        zoomPan.pointerDownHandler = event => {
            if (!zoomPan.zoomPanCallback) {
                return;
            }
            if (event.button === 1) {
                // reset min-max window
                zoomPan.zoomPanCallback();
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
                zoomPanCallback: zoomPan.zoomPanCallback,
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
            if (zoomPan.zoomPanCallback == null) {
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
                zoomPan.zoomPanCallback();
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

export default plugin;
