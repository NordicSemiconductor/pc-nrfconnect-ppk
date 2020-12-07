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

import colors from '../../colors.scss';

const { gray700: color, white, nordicBlue } = colors;

const plugin = {
    id: 'triggerLevel',

    getCoords(chartInstance) {
        const {
            chartArea: { left, top, bottom },
            scales: { yScale },
            options: { triggerLevel, triggerHandleVisible },
        } = chartInstance;
        if (triggerLevel === null || !triggerHandleVisible) {
            return null;
        }
        const y =
            chartInstance.triggerLine.y !== null
                ? chartInstance.triggerLine.y
                : yScale.getPixelForValue(triggerLevel);
        if (y < top || y > bottom) {
            return null;
        }
        const width = 24;
        const height = 10;
        return {
            y: Math.ceil(y - 0.5) + 0.5,
            label: {
                x: left - width,
                y: y - height / 2 - 0.5,
                w: width,
                h: height,
            },
        };
    },

    pointerDownHandler(evt, chartInstance) {
        const { label } = this.getCoords(chartInstance) || {};
        if (!label) return;
        const { layerX, layerY } = evt || {};
        if (
            layerX >= label.x &&
            layerX <= label.x + label.w &&
            layerY >= label.y &&
            layerY <= label.y + label.h
        ) {
            chartInstance.triggerLine.y = layerY;
        }
    },

    pointerMoveHandler(evt, chartInstance) {
        if (chartInstance.triggerLine.y === null) return;
        const { label } = this.getCoords(chartInstance) || {};
        if (!label) return;
        chartInstance.triggerLine.y = evt.layerY;
        const {
            scales: { yScale },
            options: { sendTriggerLevel },
        } = chartInstance;
        sendTriggerLevel(yScale.getValueForPixel(chartInstance.triggerLine.y));
    },

    pointerLeaveHandler(chartInstance) {
        if (!chartInstance.triggerLine) return;
        chartInstance.triggerLine.y = null;
    },

    beforeInit(chartInstance) {
        chartInstance.triggerLine = { y: null };
        const { canvas } = chartInstance.chart.ctx;
        canvas.addEventListener('pointerdown', evt =>
            plugin.pointerDownHandler(evt, chartInstance)
        );
        canvas.addEventListener('pointermove', evt =>
            plugin.pointerMoveHandler(evt, chartInstance)
        );
        canvas.addEventListener('pointerup', () =>
            plugin.pointerLeaveHandler(chartInstance)
        );
        canvas.addEventListener('pointerleave', () =>
            plugin.pointerLeaveHandler(chartInstance)
        );
    },

    afterDraw(chartInstance) {
        const {
            chartArea: { left, right },
            chart: { ctx },
            options: { formatY, triggerLevel },
        } = chartInstance;

        const coords = this.getCoords(chartInstance);

        if (!coords) return;
        const { y, label } = coords;

        ctx.save();

        function drawDashedLine() {
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = color;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.moveTo(left, y - 1); // Moving it 1px up seems to center it on the label
            ctx.lineTo(right, y - 1); // Moving it 1px up seems to center it on the label
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        function drawHandle() {
            ctx.fillStyle = nordicBlue;

            ctx.translate(label.x, label.y);
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.bezierCurveTo(0, 1, 1, 0, 2, 0);
            const curveStart = label.w - 8;
            ctx.lineTo(curveStart, 0);
            ctx.bezierCurveTo(
                label.w - 5,
                0,
                label.w,
                label.h / 2,
                label.w,
                label.h / 2
            );
            ctx.bezierCurveTo(
                label.w,
                label.h / 2,
                label.w - 5,
                label.h,
                curveStart,
                label.h
            );
            ctx.lineTo(2, label.h);
            ctx.bezierCurveTo(1, label.h, 0, label.h - 1, 0, label.h - 2);
            ctx.closePath();
            ctx.fill();

            ctx.lineWidth = 1;
            ctx.strokeStyle = colors.gray50;
            ctx.beginPath();
            ctx.closePath();
            ctx.stroke();
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function drawHandleLines() {
            ctx.lineWidth = 1;
            ctx.strokeStyle = colors.gray50;
            ctx.beginPath();
            ctx.moveTo(4, 3);
            ctx.lineTo(4, label.h - 3);
            ctx.moveTo(8, 3);
            ctx.lineTo(8, label.h - 3);
            ctx.moveTo(12, 3);
            ctx.lineTo(12, label.h - 3);
            ctx.closePath();
            ctx.stroke();
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function drawText() {
            ctx.textAlign = 'right';
            ctx.fillStyle = white;
            ctx.fillText(formatY(triggerLevel), label.w - 18, label.h / 2 + 4);
        }

        drawDashedLine();
        drawHandle();
        // drawHandleLines();
        // drawText(ctx);

        ctx.restore();
    },
};

export default plugin;
