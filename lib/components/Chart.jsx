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

// For electron runtime optimization we need to avoid operator-assiment:
/* eslint operator-assignment: off */

import React from 'react';
import PropTypes from 'prop-types';
import { defaults, Line } from 'react-chartjs-2';
import { Button, ButtonGroup, Glyphicon, ProgressBar } from 'react-bootstrap';
import math from 'mathjs';

import '../utils/chart.dragSelect'; // eslint-disable-line
import '../utils/chart.zoomPan'; // eslint-disable-line

defaults.global.tooltips.enabled = false;
defaults.global.legend.display = false;
defaults.global.animation.duration = 0;

const timestampToLabel = (usecs, index, array) => {
    const microseconds = Math.abs(usecs);
    const sign = usecs < 0 ? '-' : '';
    if (!array) {
        return `${sign}${Number((microseconds / 1e3)).toFixed(3)} ms`;
    }
    if (index > 0 && index < array.length - 1) {
        const first = array[0];
        const last = array[array.length - 1];
        const range = last - first;
        if ((usecs - first < range / 8) || (last - usecs < range / 8)) {
            return undefined;
        }
    }

    const d = new Date(microseconds / 1e3);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    const s = d.getUTCSeconds().toString().padStart(2, '0');

    const time = `${sign}${h}:${m}:${s}`;
    const subsecond = `${Number((microseconds / 1e3) % 1e3).toFixed(3)}`.padStart(7, '0');

    return [time, subsecond];
};

class Chart extends React.Component {
    constructor(props) {
        super(props);
        this.resizeLength(0);
        this.onChartSizeUpdate = this.onChartSizeUpdate.bind(this);
        this.zoomPanCallback = this.zoomPanCallback.bind(this);
        this.chartResetToLive = this.zoomPanCallback.bind(this, undefined, undefined);
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
        const { chartCursor } = this.props;
        chartCursor(cursorBegin, cursorEnd);
    }

    zoomPanCallback(begin, end) {
        const { chartWindow, chartReset, options, windowDuration } = this.props;

        if (typeof begin === 'undefined') {
            chartReset(windowDuration);
            return;
        }

        const earliestDataTime =
            options.timestamp - ((options.data.length / options.samplesPerSecond) * 1e6);
        const windowBegin = Math.max(earliestDataTime, begin);
        const windowEnd = Math.min(options.timestamp, end);

        chartWindow(windowBegin, windowEnd);
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
        const { options, index, cursorBegin, cursorEnd } = this.props;
        this.calculateWindow();

        const timestampToIndex = ts => (
            index - (((options.timestamp - ts) * options.samplesPerSecond) / 1e6)
        );

        const originalIndexBegin = timestampToIndex(this.begin);
        const originalIndexEnd = timestampToIndex(this.end);
        const step = (originalIndexEnd - originalIndexBegin) / this.len;

        if (cursorBegin) {
            this.calcBegin = cursorBegin;
            this.calcEnd = cursorEnd;
        } else {
            this.calcBegin = this.begin;
            this.calcEnd = this.end;
        }
        const calcIndexBegin = timestampToIndex(this.calcBegin);
        const calcIndexEnd = timestampToIndex(this.calcEnd);
        this.calcMax = 0;
        this.calcSum = 0;
        this.calcLen = 0;

        if (step > 1) {
            for (let mappedIndex = 0, originalIndex = originalIndexBegin;
                mappedIndex < this.len;
                mappedIndex = mappedIndex + 1, originalIndex = originalIndex + step) {
                const timestamp = this.begin + (this.duration * (mappedIndex / this.len));
                const k = Math.floor(originalIndex);
                const l = Math.floor(originalIndex + step);
                let min = Number.MAX_VALUE;
                let max = -Number.MAX_VALUE;
                for (let n = k; n < l; n = n + 1) {
                    const v = options.data[(n + options.data.length) % options.data.length];
                    if (v !== undefined) {
                        if (v > max) max = v;
                        if (v < min) min = v;
                        if (n >= calcIndexBegin && n < calcIndexEnd) {
                            if (v > this.calcMax) this.calcMax = v;
                            this.calcSum = this.calcSum + v;
                            this.calcLen = this.calcLen + 1;
                        }
                    }
                }
                if (min > max) {
                    min = undefined;
                    max = undefined;
                }
                this.lineData[mappedIndex * 2] = { x: timestamp, y: min };
                this.lineData[(mappedIndex * 2) + 1] = { x: timestamp, y: max };
            }
        } else {
            let mappedIndex = 0;
            const originalIndexBeginFloored = Math.floor(originalIndexBegin);
            const originalIndexEndCeiled = Math.ceil(originalIndexEnd);
            for (let n = originalIndexBeginFloored;
                n < originalIndexEndCeiled;
                mappedIndex = mappedIndex + 1, n = n + 1) {
                const k = (n + options.data.length) % options.data.length;
                const v = options.data[k];
                const timestamp = this.begin
                    + (((n - originalIndexBegin) * 1e6) / options.samplesPerSecond);
                this.lineData[mappedIndex] = { x: timestamp, y: v };

                if (v !== undefined && n >= calcIndexBegin && n < calcIndexEnd) {
                    if (v > this.calcMax) this.calcMax = v;
                    this.calcSum = this.calcSum + v;
                    this.calcLen = this.calcLen + 1;
                }
            }
            for (; mappedIndex < this.len + this.len; mappedIndex = mappedIndex + 1) {
                this.lineData[mappedIndex] = undefined;
            }
        }
        this.calcAvg = this.calcSum / (this.calcLen || 1);
        this.calcDelta = this.calcEnd - this.calcBegin;
        this.calcCharge = this.calcAvg * ((this.calcDelta || 1) / 1e6);
    }

    renderStats() {
        const { cursorBegin } = this.props;
        const renderValue = (label, value, unit) => {
            const v = math.unit(value, unit).format({ notation: 'fixed', precision: 3 });
            const [valStr, unitStr] = v.split(' ');
            return <span>{label}: <b>{valStr}</b> {unitStr.replace('u', '\u00B5')}</span>;
        };
        return (
            <div className="chart-stats">
                { renderValue(`${cursorBegin ? 'cursor' : 'window'} \u0394`, this.calcDelta, 'us') }
                { renderValue('avg', this.calcAvg, 'uA') }
                { renderValue('max', this.calcMax, 'uA') }
                { renderValue('charge', this.calcCharge, 'uC') }
            </div>
        );
    }

    renderProgress() {
        const {
            bufferLength,
            bufferRemaining,
            averageRunning,
        } = this.props;
        if (bufferRemaining > 0) {
            return (
                <ProgressBar
                    max={bufferLength}
                    now={bufferRemaining}
                    label={`${Number((bufferRemaining / 1e6)).toFixed(1)} s`}
                    active={averageRunning}
                    key={2}
                />
            );
        }
        return <ProgressBar className="full" label="FULL" max={1} now={1} />;
    }

    render() {
        this.calculateLineDataSets();

        const {
            id,
            options,
            cursorBegin,
            cursorEnd,
            bufferLength,
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
            <div className="chart-outer">
                <div className="chart-top">
                    <span className="title">{ id }</span>
                    { bufferLength !== null &&
                        <span>
                            Buffer:&nbsp; { this.renderProgress() }
                        </span>
                    }
                </div>
                <div className="chart-container">
                    <Line
                        ref={r => { if (r) this.chartInstance = r.chart_instance; }}
                        data={chartData}
                        options={chartOptions}
                        update={options.update}
                    />
                </div>
                <div className="chart-bottom">
                    {this.renderStats()}
                    <ButtonGroup>
                        <Button
                            bsStyle="primary"
                            bsSize="small"
                            onClick={this.resetCursor}
                            title="Clear Cursor"
                        >
                            <Glyphicon glyph="erase" />
                        </Button>
                        <Button
                            bsStyle="primary"
                            bsSize="small"
                            onClick={this.chartResetToLive}
                            title="Reset & Live"
                        >
                            <Glyphicon glyph="repeat" />
                        </Button>
                    </ButtonGroup>
                </div>
            </div>
        );
    }
}

Chart.defaultProps = {
    bufferLength: null,
    bufferRemaining: null,
    averageRunning: null,
};

Chart.propTypes = {
    chartWindow: PropTypes.func.isRequired,
    chartReset: PropTypes.func.isRequired,
    chartCursor: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    cursorBegin: PropTypes.number.isRequired,
    cursorEnd: PropTypes.number.isRequired,
    windowBegin: PropTypes.number.isRequired,
    windowEnd: PropTypes.number.isRequired,
    windowDuration: PropTypes.number.isRequired,
    index: PropTypes.number.isRequired,
    bufferLength: PropTypes.number,
    bufferRemaining: PropTypes.number,
    averageRunning: PropTypes.bool,
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
