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

export default {
    id: 'crossHair',

    beforeInit(chartInstance) {
        const crossHair = {};
        chartInstance.crossHair = crossHair;

        const { canvas } = chartInstance.chart.ctx;

        crossHair.pointerMoveHandler = event => {
            chartInstance.crossHair.moveEvent = event;
            chartInstance.update({ lazy: true });
        };
        canvas.addEventListener('pointermove', crossHair.pointerMoveHandler);
        canvas.addEventListener('pointerup', crossHair.pointerMoveHandler);
        canvas.addEventListener('pointerleave', crossHair.pointerMoveHandler);
    },

    afterDraw(chartInstance) {
        const {
            chartArea, chart, crossHair, scales,
        } = chartInstance;
        const { moveEvent } = crossHair;
        const { ctx } = chart;
        const { canvas } = ctx;

        if (!moveEvent) {
            canvas.style.cursor = 'default';
            return;
        }

        const {
            left, right, top, bottom,
        } = chartArea;
        const { layerX, layerY } = moveEvent;

        if (!(top < layerY && bottom > layerY && left < layerX && right > layerX)) {
            canvas.style.cursor = 'default';
            return;
        }
        canvas.style.cursor = 'pointer';

        const { xScale, yScale } = scales;
        const uA = this.formatY(yScale.getValueForPixel(layerY));
        const { width: uAwidth } = ctx.measureText(uA);
        const [time, subsecond] = this.formatX(xScale.getValueForPixel(layerX), 0, []);
        const { width: tsWidth } = ctx.measureText(time);

        ctx.save();
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(left, layerY - 0.5);
        ctx.lineTo(right, layerY - 0.5);
        ctx.moveTo(layerX - 0.5, top);
        ctx.lineTo(layerX - 0.5, bottom);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'black';
        ctx.fillRect(left - uAwidth - 10, layerY - 10, uAwidth + 10, 20);
        ctx.fillRect(layerX - 5 - (tsWidth / 2), bottom, tsWidth + 10, 33);

        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.fillText(uA, left - 5, layerY);

        ctx.textAlign = 'center';
        ctx.fillText(time, layerX, bottom + 10);
        ctx.fillText(subsecond, layerX, bottom + 25);

        ctx.restore();
    },

    destroy(chartInstance) {
        const { crossHair } = chartInstance;
        if (crossHair) {
            const { canvas } = chartInstance.chart.ctx || {};
            if (canvas) {
                canvas.removeEventListener('pointermove', crossHair.pointerMoveHandler);
                canvas.removeEventListener('pointerup', crossHair.pointerMoveHandler);
                canvas.removeEventListener('pointerleave', crossHair.pointerMoveHandler);
            }
            delete chartInstance.crossHair;
        }
    },
};
