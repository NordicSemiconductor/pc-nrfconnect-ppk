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

import React from 'react';
import PropTypes from 'prop-types';
import { defaults, Line } from 'react-chartjs-2';

import '../utils/chart.dragSelect'; // eslint-disable-line
import '../utils/chart.zoomPan'; // eslint-disable-line

defaults.global.tooltips.enabled = false;
defaults.global.legend.display = false;
defaults.global.animation.duration = 0;

const timestampToLabel = us => {
    const d = new Date(us / 1e3);
    const m = d.getMinutes();
    const s = d.getSeconds();
    const z = d.getMilliseconds();
    return `${`${m}`.padStart(2, '0')}:${`${s}`.padStart(2, '0')}.${`${z}`.padStart(3, '0')}`;
};

class Chart extends React.Component {
    constructor(props) {
        super(props);
        this.resizeLength(0);
        this.onChartSizeUpdate = this.onChartSizeUpdate.bind(this);
        this.zoomPanCallback = this.zoomPanCallback.bind(this);
        this.dragSelectCallback = this.dragSelectCallback.bind(this);
    }

    componentDidMount() {
        const { dragSelect, zoomPan } = this.chartInstance;
        // buggy for the first time
        this.onChartSizeUpdate(this.chartInstance);
        dragSelect.callback = this.dragSelectCallback;
        zoomPan.callback = this.zoomPanCallback;
        this.mounted = true;
    }

    onChartSizeUpdate(instance) {
        const { left, right } = instance.chart.chartArea;
        const width = Math.trunc(right - left);
        if (this.len === width) {
            return;
        }
        this.resizeLength(width);
        this.forceUpdate();
    }

    dragSelectCallback(begin, end) {
        const { id, dispatch } = this.props;
        dispatch({
            type: `CHART_${id}_CURSOR`,
            begin,
            end,
        });
    }

    zoomPanCallback(windowBegin, windowEnd) {
        const { id, dispatch, options, windowDuration } = this.props;

        if (typeof windowBegin === 'undefined') {
            dispatch({
                type: `CHART_${id}_WINDOW`,
                begin: 0,
                end: 0,
                duration: windowDuration,
            });
            return;
        }

        const earliestDataTime =
            options.timestamp - ((options.data.length / options.samplesPerSecond) * 1e6);
        const begin = Math.max(earliestDataTime, windowBegin);
        const end = Math.min(options.timestamp, windowEnd);
        dispatch({
            type: `CHART_${id}_WINDOW`,
            begin,
            end,
            duration: (end - begin),
        });
    }

    resizeLength(len) {
        this.len = len;
        this.lineData = new Array(this.len * 2);
    }

    calculateLineDataSets() {
        const { options, windowBegin, windowEnd, windowDuration } = this.props;

        const end = windowEnd || options.timestamp;
        const begin = windowBegin || (end - windowDuration);
        // const end = options.timestamp;
        // const begin = (end - windowDuration);

        let iA = options.index - (((options.timestamp - begin) * options.samplesPerSecond) / 1e6);
        const iB = options.index - (((options.timestamp - end) * options.samplesPerSecond) / 1e6);
        const step = (iB - iA) / this.len;
        iA = (iA + options.data.length) % options.data.length;

        for (let i = 0, j = iA; i < this.len; i += 1, j += step) {
            const ts = begin + (windowDuration * (i / this.len));
            const k = Math.floor(j);
            if (step > 1) {
                let [min, max] = [Number.MAX_VALUE, -Number.MAX_VALUE];
                const l = Math.floor(j + step);
                for (let n = k; n < l; n += 1) {
                    const v = options.data[n % options.data.length];
                    if (v > max) max = v;
                    if (v < min) min = v;
                }
                this.lineData[i * 2] = { x: ts, y: min };
                this.lineData[(i * 2) + 1] = { x: ts, y: max };
            } else {
                this.lineData[i] = { x: ts, y: options.data[k % options.data.length] };
                this.lineData[this.len + i] = undefined;
            }
        }
    }

    render() {
        this.calculateLineDataSets();

        const { options, windowBegin, windowEnd, windowDuration } = this.props;

        const end = windowEnd || options.timestamp;
        const begin = windowBegin || (end - windowDuration);

        const chartData = {
            datasets: [{
                borderColor: options.color,
                borderWidth: 1,
                fill: false,
                data: this.lineData,
                pointRadius: 0,
                lineTension: 0,
                label: 'data0',
            }],
        };

        const { min, max } = options.valueRange;
        const chartOptions = {
            scales: {
                xAxes: [{
                    id: 'x-axis-0',
                    type: 'linear',
                    min: begin,
                    max: end,
                    ticks: {
                        maxRotation: 0,
                        autoSkipPadding: 25,
                        min: begin,
                        max: end,
                        callback: timestampToLabel,
                    },
                    gridLines: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: false,
                    },
                }],
                yAxes: [{
                    type: 'linear', min, max, ticks: { min, max },
                }],
            },
            redraw: true,
            maintainAspectRatio: false,
            onResize: this.onChartSizeUpdate,
        };

        return (
            <Line
                ref={r => { if (r) this.chartInstance = r.chart_instance; }}
                data={chartData}
                options={chartOptions}
                index={options.index}
            />
        );
    }
}

Chart.propTypes = {
    dispatch: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    windowBegin: PropTypes.number.isRequired,
    windowEnd: PropTypes.number.isRequired,
    windowDuration: PropTypes.number.isRequired,
    options: PropTypes.shape({
        DataType: PropTypes.func,
        // data: PropsTypes.instanceOf(...),
        index: PropTypes.number,
        timestamp: PropTypes.number,
        samplesPerSecond: PropTypes.number,
        color: PropTypes.string,
        valueRange: PropTypes.objectOf(PropTypes.number),
    }).isRequired,
};

export default Chart;
