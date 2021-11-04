/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { colors } from 'pc-nrfconnect-shared';

const { gray700: color, white } = colors;

const plugin = {
    id: 'crossHair',
    instances: [],
    moveEvent: null,

    pointerMoveHandler(
        evt,
        { chartArea: { left }, id, chart, options: { snapping, live } }
    ) {
        if (live) {
            plugin.moveEvent = null;
            return;
        }
        let { layerX, layerY } = evt || {};

        if (snapping) {
            const hit = chart.getElementAtEvent(evt)[0];
            if (hit) {
                // eslint-disable-next-line no-underscore-dangle
                const { x, y } = hit._model;
                layerX = x;
                layerY = y;
            }
        }
        plugin.moveEvent = { layerX: layerX - left, layerY, id };
        plugin.instances.forEach(instance => instance.update({ lazy: true }));
    },

    pointerLeaveHandler() {
        plugin.moveEvent = null;
        plugin.instances.forEach(instance => instance.update({ lazy: true }));
    },

    beforeInit(chartInstance) {
        plugin.instances.push(chartInstance);
        const { canvas } = chartInstance.chart.ctx;
        canvas.addEventListener('pointermove', evt =>
            plugin.pointerMoveHandler(evt, chartInstance)
        );
        canvas.addEventListener('pointerup', evt =>
            plugin.pointerMoveHandler(evt, chartInstance)
        );
        canvas.addEventListener('pointerleave', plugin.pointerLeaveHandler);
    },

    afterDraw(chartInstance) {
        const {
            chartArea: { left, right, top, bottom },
            chart: { ctx },
            scales: { xScale, yScale },
            options: { formatX, formatY },
        } = chartInstance;
        const { canvas } = ctx;

        if (!plugin.moveEvent) {
            canvas.style.cursor = 'default';
            return;
        }

        const { layerX, layerY } = plugin.moveEvent;
        const x = Math.ceil(layerX - 0.5) - 0.5;
        const y = Math.ceil(layerY - 0.5) + 0.5;

        if (layerX >= 0 && layerX <= right - left) {
            ctx.save();
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(left + x, top);
            ctx.lineTo(left + x, bottom);
            ctx.closePath();
            ctx.stroke();

            if (chartInstance.height > 32) {
                const [time, subsecond] = formatX(
                    xScale.getValueForPixel(left + layerX),
                    0,
                    []
                );
                const { width: tsWidth } = ctx.measureText(time);
                ctx.fillStyle = color;
                ctx.textAlign = 'right';
                ctx.fillRect(left + layerX, top, tsWidth + 10, 33);
                ctx.fillStyle = white;
                ctx.textAlign = 'center';
                ctx.fillText(time, left + layerX + 5 + tsWidth / 2, top + 13);
                ctx.fillText(
                    subsecond,
                    left + layerX + 5 + tsWidth / 2,
                    top + 28
                );
            }

            ctx.restore();
        }

        if (layerY < top || layerY > bottom) {
            canvas.style.cursor = 'default';
            return;
        }

        canvas.style.cursor = 'pointer';

        if (yScale) {
            ctx.save();
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.closePath();
            ctx.stroke();

            const uA = yScale ? formatY(yScale.getValueForPixel(layerY)) : null;
            const { width: uAwidth } = ctx.measureText(uA);

            ctx.fillStyle = color;
            ctx.textAlign = 'right';
            ctx.fillRect(right - uAwidth - 10, layerY - 20, uAwidth + 10, 20);
            ctx.fillStyle = white;
            ctx.fillText(uA, right - 5, layerY - 7);
            ctx.restore();
        }
    },

    destroy(chartInstance) {
        const i = plugin.instances.findIndex(
            ({ id }) => id === chartInstance.id
        );
        if (i > -1) {
            plugin.instances.splice(i, 1);
        }
    },
};

export default plugin;
