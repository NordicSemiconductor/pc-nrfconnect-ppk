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
import { Button, ButtonGroup } from 'react-bootstrap';

import '../utils/chart.dragSelect'; // eslint-disable-line
import '../utils/chart.zoomPan'; // eslint-disable-line

defaults.global.tooltips.enabled = false;
defaults.global.legend.display = false;
defaults.global.animation.duration = 0;

class Chart extends React.Component {
    constructor(props) {
        super(props);
        this.resizeLength(0);
        this.onChartSizeUpdate = this.onChartSizeUpdate.bind(this);
        this.zoomPanCallback = this.zoomPanCallback.bind(this);
        this.dragSelectCallback = this.dragSelectCallback.bind(this);
        this.resetCursor = this.dragSelectCallback.bind(this, 0, 0);
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

    dragSelectCallback(cursorBegin, cursorEnd) {
        const { id, dispatch } = this.props;
        dispatch({
            type: `CHART_${id}_CURSOR`,
            cursorBegin,
            cursorEnd,
        });
    }

    zoomPanCallback(begin, end) {
        const { id, dispatch, options, windowDuration } = this.props;

        if (typeof begin === 'undefined') {
            dispatch({
                type: `CHART_${id}_WINDOW`,
                windowBegin: 0,
                windowEnd: 0,
                windowDuration,
            });
            return;
        }

        const earliestDataTime =
            options.timestamp - ((options.data.length / options.samplesPerSecond) * 1e6);
        const windowBegin = Math.max(earliestDataTime, begin);
        const windowEnd = Math.min(options.timestamp, end);
        dispatch({
            type: `CHART_${id}_WINDOW`,
            windowBegin,
            windowEnd,
            windowDuration: (windowEnd - windowBegin),
        });
    }

    resizeLength(len) {
        this.len = len;
        this.lineData = new Array(this.len * 2);
    }

    calculateWindow() {
        const { options, windowBegin, windowEnd, windowDuration } = this.props;

        this.duration = windowDuration;
        this.end = windowEnd || options.timestamp;
        this.begin = windowBegin || (this.end - this.duration);
    }

    calculateLineDataSets() {
        const { options, index } = this.props;
        this.calculateWindow();

        const iA = index - (((options.timestamp - this.begin) * options.samplesPerSecond) / 1e6);
        const iB = index - (((options.timestamp - this.end) * options.samplesPerSecond) / 1e6);
        const step = (iB - iA) / this.len;

        if (step > 1) {
            for (let i = 0, j = iA; i < this.len; i += 1, j += step) {
                const ts = this.begin + (this.duration * (i / this.len));
                const k = Math.floor(j);
                const l = Math.floor(j + step);
                let [min, max] = [Number.MAX_VALUE, -Number.MAX_VALUE];
                for (let n = k; n < l; n += 1) {
                    const v = options.data[(n + options.data.length) % options.data.length];
                    if (v > max) max = v;
                    if (v < min) min = v;
                }
                this.lineData[i * 2] = { x: ts, y: min };
                this.lineData[(i * 2) + 1] = { x: ts, y: max };
            }
        } else {
            let i = 0;
            for (let j = iA; j < iB; i += 1, j += 1) {
                const ts = this.begin + (this.duration * ((i / step) / this.len));
                const k = Math.floor(j + options.data.length) % options.data.length;
                this.lineData[i] = { x: ts, y: options.data[k] };
            }
            for (; i < this.len * 2; i += 1) {
                this.lineData[i] = undefined;
            }
        }
    }

    renderStats() {
        const {
            rms,
            avg,
            max,
            charge,
            cursorBegin,
            cursorEnd,
            timestampToLabel,
        } = this.props;

        if (!cursorBegin) {
            return (
                <div className="chart-stats">
                    <span>Set cursor by shift + left mouse button dragging in the chart.</span>
                </div>
            );
        }

        return (
            <div className="chart-stats">
                <span>
                    cursor: {timestampToLabel(cursorBegin)}
                    &ndash;{timestampToLabel(cursorEnd)}
                </span>
                <span>rms: <b>{rms}</b> nA</span>
                <span>avg: <b>{avg}</b> nA</span>
                <span>max: <b>{max}</b> nA</span>
                <span>charge: <b>{charge}</b> nC</span>
            </div>
        );
    }

    render() {
        this.calculateLineDataSets();

        const {
            id,
            options,
            cursorBegin,
            cursorEnd,
            timestampToLabel,
        } = this.props;

        const chartData = {
            datasets: [{
                borderColor: options.color,
                borderWidth: 1,
                fill: false,
                data: this.lineData.slice(),
                pointRadius: 0,
                lineTension: 0.2,
                label: 'data0',
            }],
        };

        const chartOptions = {
            title: {
                display: true,
                text: `${id}`,
            },
            scales: {
                xAxes: [{
                    id: 'x-axis-0',
                    type: 'linear',
                    min: this.begin,
                    max: this.end,
                    ticks: {
                        maxRotation: 0,
                        autoSkipPadding: 25,
                        min: this.begin,
                        max: this.end,
                        callback: timestampToLabel,
                        maxTicksLimit: 7,
                    },
                    gridLines: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: false,
                    },
                    cursor: {
                        cursorBegin,
                        cursorEnd,
                    },
                }],
                yAxes: [{
                    type: 'linear',
                    min: options.valueRange.min,
                    max: options.valueRange.max,
                    ticks: { suggestedMax: 10, maxTicksLimit: 7 },
                }],
            },
            redraw: true,
            maintainAspectRatio: false,
            onResize: this.onChartSizeUpdate,
        };

        return (
            <div className="chart-container">
                <Line
                    ref={r => { if (r) this.chartInstance = r.chart_instance; }}
                    data={chartData}
                    options={chartOptions}
                    update={options.update}
                />
                <div className="chart-bottom">
                    {this.renderStats()}
                    <ButtonGroup>
                        <Button bsStyle="primary" bsSize="small" onClick={this.resetCursor}>
                            Clear Cursor
                        </Button>
                    </ButtonGroup>
                </div>
            </div>
        );
    }
}

Chart.propTypes = {
    dispatch: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    rms: PropTypes.number.isRequired,
    avg: PropTypes.number.isRequired,
    max: PropTypes.number.isRequired,
    charge: PropTypes.number.isRequired,
    cursorBegin: PropTypes.number.isRequired,
    cursorEnd: PropTypes.number.isRequired,
    windowBegin: PropTypes.number.isRequired,
    windowEnd: PropTypes.number.isRequired,
    windowDuration: PropTypes.number.isRequired,
    index: PropTypes.number.isRequired,
    timestampToLabel: PropTypes.func.isRequired,
    options: PropTypes.shape({
        // data: PropsTypes.instanceOf(...),
        index: PropTypes.number,
        timestamp: PropTypes.number,
        samplesPerSecond: PropTypes.number,
        color: PropTypes.string,
        valueRange: PropTypes.objectOf(PropTypes.number),
    }).isRequired,
};

export default Chart;
