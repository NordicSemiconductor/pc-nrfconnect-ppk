/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const wheelZoomFactor = 1.25;

const isTrackPad = evt => {
    if (evt.deltaX) return true;
    if (evt.wheelDeltaY) {
        if (evt.wheelDeltaY === evt.deltaY * -3) {
            return true;
        }
    } else if (evt.deltaMode === 0) {
        return true;
    }
    return false;
};

const zoomAtOrigin = (
    callback,
    pX,
    factorX,
    xMin,
    xMax,
    pY,
    factorY,
    yMin,
    yMax
) => {
    const zX = Math.max(factorX, 0.1);
    const newMinX = pX - (pX - xMin) / zX;
    const newMaxX = pX + (xMax - pX) / zX;
    if (pY !== undefined) {
        const zY = Math.max(factorY, 0.1);
        const newMinY = pY - (pY - yMin) / zY;
        const newMaxY = pY + (yMax - pY) / zY;
        callback(newMinX, newMaxX, newMinY, newMaxY);
        return;
    }
    callback(newMinX, newMaxX, null, null);
};

let processingWheelEvents = false;
let wheelEventToProcess;

const processWheelEvents = () => {
    processingWheelEvents = false;

    const { event, scales, callback } = wheelEventToProcess;

    if (!callback) {
        return;
    }

    const { clientX, clientY, deltaX, deltaY } = event;

    const { left: xOffset, top: yOffset } =
        event.target.getBoundingClientRect();

    const isTrackPadEvent = isTrackPad(event);
    const isTrackpadPan = isTrackPadEvent && !event.shiftKey;
    const isTrackpadZoom = isTrackPadEvent && event.shiftKey;

    const { xScale, yScale } = scales;
    const { min: xMin, max: xMax, start: x0, end: x1, width } = scales.xScale;
    const { min: yMin, max: yMax, start: y0, end: y1, height } = scales.yScale;

    if (isTrackpadZoom) {
        const pX =
            xMin + (xMax - xMin) * ((clientX - xOffset - xScale.left) / width);
        const pY =
            yMax + (yMin - yMax) * ((clientY - yOffset - yScale.top) / height);
        const fx = 1.01 ** deltaX;
        const fy = 1.01 ** deltaY;
        zoomAtOrigin(callback, pX, fx, xMin, xMax, pY, fy, yMin, yMax);
    } else if (isTrackpadPan) {
        const fx = (x1 - x0) / width;
        const fy = (y0 - y1) / height;
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
        zoomAtOrigin(callback, p, z, xMin, Math.ceil(xMax));
    }
};

let processingPointerMoveEvents = false;
let pointerMoveEventToProcess;

const processPointerMoveEvents = () => {
    processingPointerMoveEvents = false;

    const { event, dragStart, scales, callback } = pointerMoveEventToProcess;

    if (!callback) {
        return;
    }

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

export default {
    id: 'zoomPan',

    beforeInit(chartInstance) {
        const zoomPan = {};
        chartInstance.zoomPan = zoomPan;

        const { canvas } = chartInstance.$context.chart.ctx;

        zoomPan.wheelHandler = event => {
            wheelEventToProcess = {
                event,
                scales: chartInstance.scales,
                callback: zoomPan.callback,
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
            if (event.button === 0 || event.button === 2) {
                const type = event.button === 2 ? 'zoom' : 'pan';
                const { xScale, yScale } = chartInstance.scales;
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
            event.target.setPointerCapture(event.pointerId);
            zoomPan.dragStart.moved = true;

            pointerMoveEventToProcess = {
                event,
                dragStart: { ...zoomPan.dragStart },
                scales: chartInstance.scales,
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
