/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { colors } from 'pc-nrfconnect-shared';

const CHART_SELECTION_COLOR = colors.gray100;
const CHART_DRAG_COLOR = colors.gray100;

export default {
    id: 'dragSelect',

    beforeInit(chartInstance) {
        const dragSelect = {};
        chartInstance.dragSelect = dragSelect;

        const { canvas } = chartInstance.$context.chart.ctx;

        dragSelect.pointerDownHandler = event => {
            if (event.button === 0 && event.shiftKey) {
                dragSelect.dragStart = event;
                dragSelect.callback();
            }
        };
        canvas.addEventListener('pointerdown', dragSelect.pointerDownHandler);

        dragSelect.pointerMoveHandler = event => {
            if (chartInstance.dragSelect.dragStart) {
                chartInstance.dragSelect.dragEnd = event;
                chartInstance.update({ lazy: true });
            }
        };
        canvas.addEventListener('pointermove', dragSelect.pointerMoveHandler);

        dragSelect.pointerUpHandler = event => {
            if (dragSelect.dragStart) {
                const { dragStart } = dragSelect;
                const offsetX = dragStart.target.getBoundingClientRect().left;
                const startX =
                    Math.min(dragStart.clientX, event.clientX) - offsetX;
                const endX =
                    Math.max(dragStart.clientX, event.clientX) - offsetX;

                if (endX > startX) {
                    const scale = chartInstance.scales.xScale;
                    const min = scale.getValueForPixel(startX).valueOf();
                    const max = scale.getValueForPixel(endX).valueOf();

                    dragSelect.callback(min, max);
                    chartInstance.update({ lazy: true });
                }
                dragSelect.dragStart = null;
                dragSelect.dragEnd = null;
            }
        };
        canvas.addEventListener('pointerup', dragSelect.pointerUpHandler);
        canvas.addEventListener('pointerleave', dragSelect.pointerUpHandler);
    },

    beforeDraw(chartInstance) {
        const {
            chartArea: { left, right, top, bottom: areaBottom },
            // chart: { ctx },
            scales: { xAxes: scale },
            dragSelect: { dragStart, dragEnd },
            canvas: { height: bottom },
        } = chartInstance;
        const { ctx } = chartInstance.$context.chart;
        const { cursor } = scale.options;

        if (typeof cursor.cursorBegin !== 'number' && !(dragStart && dragEnd)) {
            return;
        }

        ctx.save();

        if (typeof cursor.cursorBegin === 'number') {
            const { cursorBegin, cursorEnd } = cursor;
            const sX =
                Math.ceil(scale.getPixelForValue(cursorBegin) - 0.5) - 0.5;
            const eX = Math.ceil(scale.getPixelForValue(cursorEnd) - 0.5) - 0.5;
            const startX = Math.max(sX, left);
            const endX = Math.min(eX, right);
            if (startX < right && endX > left) {
                ctx.fillStyle = CHART_SELECTION_COLOR;
                ctx.fillRect(startX, top, endX - startX, areaBottom - top);
            }
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = colors.gray700;
            ctx.fillStyle = colors.gray700;
            ctx.setLineDash([4, 4]);
            if (sX >= left && sX <= right) {
                ctx.beginPath();
                ctx.moveTo(sX, top);
                ctx.lineTo(sX, bottom);
                ctx.closePath();
                ctx.stroke();
            }
            if (eX >= left && eX <= right) {
                ctx.beginPath();
                ctx.moveTo(eX, top);
                ctx.lineTo(eX, bottom);
                ctx.closePath();
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        if (dragStart && dragEnd) {
            const offsetX = dragStart.target.getBoundingClientRect().left;
            const startX = Math.max(
                Math.min(dragStart.clientX, dragEnd.clientX) - offsetX,
                left
            );
            const endX = Math.min(
                Math.max(dragStart.clientX, dragEnd.clientX) - offsetX,
                right
            );
            ctx.fillStyle = CHART_DRAG_COLOR;
            ctx.fillRect(startX, top, endX - startX, areaBottom - top);
        }
        ctx.restore();
    },
};
