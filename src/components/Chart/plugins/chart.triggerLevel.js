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

const { amber: colorActive, gray600: colorInactive, white } = colors;

// eslint-disable-next-line func-names
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
};

const plugin = {
    id: 'triggerLevel',

    getCoords(chartInstance) {
        const {
            chartArea: { left, top, bottom }, scales: { yScale },
            options: { triggerLevel, triggerHandleVisible },
        } = chartInstance;
        if (triggerLevel === null || !triggerHandleVisible) {
            return null;
        }
        const y = chartInstance.triggerLine.y !== null
            ? chartInstance.triggerLine.y
            : yScale.getPixelForValue(triggerLevel);
        if (y < top || y > bottom) {
            return null;
        }
        return {
            y,
            label: {
                x: left - 62,
                y: y - 10,
                w: 70,
                h: 20,
            },
        };
    },

    pointerDownHandler(evt, chartInstance) {
        const { label } = this.getCoords(chartInstance) || {};
        if (!label) return;
        const { layerX, layerY } = evt || {};
        if (layerX >= label.x && layerX <= label.x + label.w
            && layerY >= label.y && layerY <= label.y + label.h) {
            chartInstance.triggerLine.y = layerY;
        }
    },

    pointerMoveHandler(evt, chartInstance) {
        if (chartInstance.triggerLine.y === null) return;
        const { label } = this.getCoords(chartInstance) || {};
        if (!label) return;
        chartInstance.triggerLine.y = evt.layerY;
    },

    pointerLeaveHandler(chartInstance) {
        if (!chartInstance.triggerLine) return;
        if (chartInstance.triggerLine.y !== null) {
            const { scales: { yScale }, options: { sendTriggerLevel } } = chartInstance;
            sendTriggerLevel(yScale.getValueForPixel(chartInstance.triggerLine.y));
        }
        chartInstance.triggerLine.y = null;
    },

    beforeInit(chartInstance) {
        chartInstance.triggerLine = { y: null };
        const { canvas } = chartInstance.chart.ctx;
        canvas.addEventListener('pointerdown', evt => plugin.pointerDownHandler(evt, chartInstance));
        canvas.addEventListener('pointermove', evt => plugin.pointerMoveHandler(evt, chartInstance));
        canvas.addEventListener('pointerup', () => plugin.pointerLeaveHandler(chartInstance));
        canvas.addEventListener('pointerleave', () => plugin.pointerLeaveHandler(chartInstance));
    },

    afterDraw(chartInstance) {
        const {
            chartArea: { left, right },
            chart: { ctx },
            options: { formatY, triggerLevel, triggerActive },
        } = chartInstance;

        const coords = this.getCoords(chartInstance);

        if (!coords) return;
        const { y, label } = coords;

        const color = triggerActive ? colorActive : colorInactive;

        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(left, y - 0.5);
        ctx.lineTo(right, y - 0.5);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.roundRect(label.x, label.y, label.w, label.h, 2).fill();
        ctx.fillStyle = white;
        ctx.fillText(formatY(triggerLevel), label.x + label.w - 18, label.y + 13);

        ctx.lineWidth = 1;
        ctx.strokeStyle = white;
        ctx.beginPath();
        ctx.moveTo(left - 4, y - 2.5); ctx.lineTo(left + 4, y - 2.5);
        ctx.moveTo(left - 4, y - 0.5); ctx.lineTo(left + 4, y - 0.5);
        ctx.moveTo(left - 4, y + 1.5); ctx.lineTo(left + 4, y + 1.5);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    },
};

export default plugin;
