/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint no-param-reassign: off */

import colors from '../../colors.icss.scss';

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
