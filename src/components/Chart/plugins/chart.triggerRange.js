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

import { options } from '../../../globals';
import colors from '../../colors.scss';

const { indigo: color } = colors;

const plugin = {
    id: 'triggerRange',

    beforeDatasetsDraw(chartInstance) {
        const {
            chartArea: { top, left, right },
            chart: { ctx },
            scales: { xScale: scale },
        } = chartInstance;

        if (!options.triggerMarkers) return;

        const min = scale.getValueForPixel(left);
        const max = scale.getValueForPixel(right);

        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, right - left, 16);
        ctx.clip();
        ctx.fillStyle = color;

        options.triggerMarkers
            .reduce((pairs, _, i, array) => {
                if (!(i % 2)) {
                    const [a, b] = array.slice(i, i + 2);
                    if (b > min && a < max) {
                        pairs.push([a, b]);
                    }
                }
                return pairs;
            }, [])
            .forEach(([a, b]) => {
                const x1 = scale.getPixelForValue(a);
                const x2 = scale.getPixelForValue(b);
                const d = x2 - x1;
                const s = d / Math.max(1, Math.floor(d / 6));
                for (let x = x1; x < x2 + 1; x += s) {
                    ctx.beginPath();
                    ctx.moveTo(x - 3, top);
                    ctx.lineTo(x + 3, top);
                    ctx.lineTo(x, top + 4);
                    ctx.fill();
                }
            });

        ctx.restore();
    },
};

export default plugin;
