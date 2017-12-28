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
            if (scale.isHorizontal() && !chartInstance.zoomPan.scale) {
                chartInstance.zoomPan.scale = scale;
            }
        });
    },

    beforeInit(chartInstance) {
        const zoomPan = {};
        chartInstance.zoomPan = zoomPan;

        const { canvas } = chartInstance.chart.ctx;

        zoomPan.zoomAtOriginBy = (p, factor, min, max) => {
            const z = Math.max(factor, 0.1);
            const newMin = p - ((p - min) / z);
            const newMax = p + ((max - p) / z);
            zoomPan.callback(newMin, newMax);
        };

        zoomPan.wheelHandler = event => {
            if (!zoomPan.callback) {
                return;
            }

            const offsetX = event.target.getBoundingClientRect().left;
            const p = zoomPan.scale.getValueForPixel(event.clientX - offsetX);

            let z = 0;
            if (event.deltaY < 0) z = wheelZoomFactor;
            if (event.deltaY > 0) z = 1 / wheelZoomFactor;

            const { min, max } = zoomPan.scale;
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
                const { scale } = zoomPan;
                const { min, max } = scale;
                const offsetX = event.target.getBoundingClientRect().left;
                const p = min + ((max - min) * (
                    (event.clientX - offsetX - scale.left) / scale.width)
                );

                zoomPan.dragStart = {
                    type,
                    p,
                    min,
                    max,
                };
            }
        };
        canvas.addEventListener('mousedown', zoomPan.mouseDownHandler);

        zoomPan.mouseMoveHandler = event => {
            if (!zoomPan.dragStart) {
                return;
            }
            zoomPan.dragStart.moved = true;
            const { min, max, p } = zoomPan.dragStart;
            const { scale } = zoomPan;
            const offsetX = event.target.getBoundingClientRect().left;
            const q = min + ((max - min) * (
                (event.clientX - offsetX - scale.left) / scale.width)
            );

            if (zoomPan.dragStart.type === 'pan') {
                zoomPan.callback(min + (p - q), max + (p - q));
                return;
            }

            const z = (wheelZoomFactor * 4) ** ((q - p) / (max - min));
            zoomPan.zoomAtOriginBy(p, z, min, max);
        };
        canvas.addEventListener('mousemove', zoomPan.mouseMoveHandler);

        zoomPan.mouseUpHandler = () => {
            if (zoomPan.dragStart && zoomPan.dragStart.type === 'zoom' && !zoomPan.dragStart.moved) {
                zoomPan.callback();
            }
            zoomPan.dragStart = null;
        };
        canvas.addEventListener('mouseup', zoomPan.mouseUpHandler);
    },

    destroy(chartInstance) {
        const { zoomPan } = chartInstance;
        if (zoomPan) {
            const { canvas } = chartInstance.chart.ctx;

            canvas.removeEventListener('mousedown', zoomPan.mouseDownHandler);
            canvas.removeEventListener('mousemove', zoomPan.mouseMoveHandler);
            canvas.removeEventListener('mouseup', zoomPan.mouseUpHandler);
            canvas.removeEventListener('wheel', zoomPan.wheelHandler);

            delete chartInstance.zoomPan;
        }
    },
};

module.exports = zoomPanPlugin;
Chart.pluginService.register(zoomPanPlugin);
