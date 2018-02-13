/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
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

const Chart = require('chart.js');

const wheelZoomFactor = 1.25;

const zoomPanPlugin = {
    id: 'zoomPan',

    afterInit(chartInstance) {
        Object.keys(chartInstance.scales).forEach(key => {
            const scale = chartInstance.scales[key];
            if (scale.isHorizontal() && !chartInstance.zoomPan.xScale) {
                chartInstance.zoomPan.xScale = scale;
            }
            if (!scale.isHorizontal() && !chartInstance.zoomPan.yScale) {
                chartInstance.zoomPan.yScale = scale;
            }
        });
    },

    beforeInit(chartInstance) {
        const zoomPan = {};
        chartInstance.zoomPan = zoomPan;

        const { canvas } = chartInstance.chart.ctx;

        zoomPan.zoomAtOriginBy = (pX, factorX, xMin, xMax, pY, factorY, yMin, yMax) => {
            const zX = Math.max(factorX, 0.1);
            const newMinX = pX - ((pX - xMin) / zX);
            const newMaxX = pX + ((xMax - pX) / zX);
            if (pY !== undefined) {
                const zY = Math.max(factorY, 0.1);
                const newMinY = pY - ((pY - yMin) / zY);
                const newMaxY = pY + ((yMax - pY) / zY);
                zoomPan.callback(newMinX, newMaxX, newMaxY, newMinY);
                return;
            }
            zoomPan.callback(newMinX, newMaxX, null, null);
        };

        zoomPan.wheelHandler = event => {
            if (!zoomPan.callback) {
                return;
            }

            const offsetX = event.target.getBoundingClientRect().left;
            const p = zoomPan.xScale.getValueForPixel(event.clientX - offsetX);

            let z = 0;
            if (event.deltaY < 0) z = wheelZoomFactor;
            if (event.deltaY > 0) z = 1 / wheelZoomFactor;

            const { min, max } = zoomPan.xScale;
            zoomPan.zoomAtOriginBy(p, z, min, max);
        };
        canvas.addEventListener('wheel', zoomPan.wheelHandler);

        zoomPan.mouseDownHandler = event => {
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
                const type = (event.button === 2) ? 'zoom' : 'pan';
                const { xScale, yScale } = zoomPan;
                const { min: xMin, max: xMax } = xScale;
                const { max: yMin, min: yMax } = yScale;
                const xOffset = event.target.getBoundingClientRect().left;
                const yOffset = event.target.getBoundingClientRect().top;
                const pX = xMin + ((xMax - xMin) * (
                    (event.clientX - xOffset - xScale.left) / xScale.width)
                );
                const pY = yMin + ((yMax - yMin) * (
                    (event.clientY - yOffset - yScale.top) / yScale.height)
                );

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
        canvas.addEventListener('pointerdown', zoomPan.mouseDownHandler);

        zoomPan.mouseMoveHandler = event => {
            if (!zoomPan.dragStart) {
                return;
            }
            event.target.setPointerCapture(event.pointerId);
            zoomPan.dragStart.moved = true;
            const { xMin, xMax, yMin, yMax, pX, pY } = zoomPan.dragStart;
            const { xScale, yScale } = zoomPan;
            const xOffset = event.target.getBoundingClientRect().left;
            const yOffset = event.target.getBoundingClientRect().top;
            const qX = xMin + ((xMax - xMin) * (
                (event.clientX - xOffset - xScale.left) / xScale.width)
            );
            const qY = yMin + ((yMax - yMin) * (
                (event.clientY - yOffset - yScale.top) / yScale.height)
            );

            if (zoomPan.dragStart.type === 'pan') {
                zoomPan.callback(xMin + (pX - qX), xMax + (pX - qX), null, null);
                return;
            }

            const zX = (wheelZoomFactor * 4) ** ((qX - pX) / (xMax - xMin));
            const zY = (wheelZoomFactor * 4) ** ((qY - pY) / (yMax - yMin));
            zoomPan.zoomAtOriginBy(pX, zX, xMin, xMax, pY, zY, yMin, yMax);
        };
        canvas.addEventListener('pointermove', zoomPan.mouseMoveHandler, false);

        zoomPan.mouseUpHandler = () => {
            if (zoomPan.dragStart && zoomPan.dragStart.type === 'zoom' && !zoomPan.dragStart.moved) {
                zoomPan.callback();
            }
            zoomPan.dragStart = null;
        };
        canvas.addEventListener('pointerup', zoomPan.mouseUpHandler, false);
    },

    destroy(chartInstance) {
        const { zoomPan } = chartInstance;
        if (zoomPan) {
            const { canvas } = chartInstance.chart.ctx;

            canvas.removeEventListener('pointerdown', zoomPan.mouseDownHandler);
            canvas.removeEventListener('pointermove', zoomPan.mouseMoveHandler);
            canvas.removeEventListener('pointerup', zoomPan.mouseUpHandler);
            canvas.removeEventListener('wheel', zoomPan.wheelHandler);

            delete chartInstance.zoomPan;
        }
    },
};

Chart.pluginService.register(zoomPanPlugin);
