/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Chart, Plugin } from 'chart.js';
import { colors } from 'pc-nrfconnect-shared';

const { gray700: color, white } = colors;

interface Something extends Plugin<'line'> {
    instances: Chart[];
    moveEvent: { offsetX: number; offsetY: number; id: string } | null;
    pointerMoveHandler: (event: MouseEvent, chart: Chart) => void;
    pointerLeaveHandler: () => void;
}

const pluginBuilder = ({
    formatX,
    formatY,
    snapping,
    live,
}: {
    formatX: (_usecs: number, index: number, array: number[]) => string[];
    formatY: (uA: number) => string;
    live: boolean;
    snapping: boolean;
}) => {
    const plugin: Something = {
        id: 'crossHair',
        instances: [],
        moveEvent: null,

        pointerMoveHandler(evt, chart: Chart) {
            const {
                chartArea: { left },
                id,
            } = chart;
            if (live) {
                plugin.moveEvent = null;
                return;
            }
            let { offsetX, offsetY } = evt || {};

            if (snapping) {
                const hit = chart.getElementsAtEventForMode(
                    evt,
                    'nearest',
                    {},
                    true
                )[0];
                if (hit) {
                    const { x, y } = hit.element;
                    offsetX = x;
                    offsetY = y;
                }
            }
            plugin.moveEvent = { offsetX: offsetX - left, offsetY, id };
            plugin.instances.forEach(instance => instance.update('none'));
        },

        pointerLeaveHandler() {
            plugin.moveEvent = null;
            plugin.instances.forEach(instance => instance.update('none'));
        },

        beforeInit(chartInstance) {
            plugin.instances.push(chartInstance);
            const { canvas } = chartInstance.ctx;
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
                scales: { xScale, yScale },
            } = chartInstance;

            const { ctx } = chartInstance;
            const { canvas } = ctx;

            if (!plugin.moveEvent) {
                canvas.style.cursor = 'default';
                return;
            }

            const { offsetX, offsetY } = plugin.moveEvent;
            const x = Math.ceil(offsetX - 0.5) - 0.5;
            const y = Math.ceil(offsetY - 0.5) + 0.5;

            if (offsetX >= 0 && offsetX <= right - left) {
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
                        xScale.getValueForPixel(left + offsetX)!,
                        0,
                        []
                    );
                    const { width: tsWidth } = ctx.measureText(time);
                    ctx.fillStyle = color;
                    ctx.textAlign = 'right';
                    ctx.fillRect(left + offsetX, top, tsWidth + 10, 33);
                    ctx.fillStyle = white;
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        time,
                        left + offsetX + 5 + tsWidth / 2,
                        top + 13
                    );
                    ctx.fillText(
                        subsecond,
                        left + offsetX + 5 + tsWidth / 2,
                        top + 28
                    );
                }

                ctx.restore();
            }

            if (offsetY < top || offsetY > bottom) {
                canvas.style.cursor = 'default';
                return;
            }

            canvas.style.cursor = 'pointer';

            if (yScale?.id === 'yScale') {
                ctx.save();
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(left, y);
                ctx.lineTo(right, y);
                ctx.closePath();
                ctx.stroke();

                const uA = yScale
                    ? formatY(yScale.getValueForPixel(offsetY)!)
                    : '';
                const { width: uAwidth } = ctx.measureText(uA);

                ctx.fillStyle = color;
                ctx.textAlign = 'right';
                ctx.fillRect(
                    right - uAwidth - 10,
                    offsetY - 20,
                    uAwidth + 10,
                    20
                );
                ctx.fillStyle = white;
                ctx.fillText(uA, right - 5, offsetY - 7);
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
    return plugin;
};

export default pluginBuilder;
