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

        this.calcDelta = 0;
        this.calcAvg = 0;
        this.calcMax = 0;

        this.resizeLength(0);
        this.onChartSizeUpdate = this.onChartSizeUpdate.bind(this);
        this.zoomPanCallback = this.zoomPanCallback.bind(this);
        this.chartResetToLive = this.zoomPanCallback.bind(this, undefined, undefined);
        this.dragSelectCallback = this.dragSelectCallback.bind(this);
        this.resetCursor = this.dragSelectCallback.bind(this, null, null);
        this.registerPluginCallbacks = this.registerPluginCallbacks.bind(this);
        this.chartPause = this.chartPause.bind(this);
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

    timestampToIndex(ts) {
        const { options, index } = this.props;
        return index - (((options.timestamp - ts) * options.samplesPerSecond) / 1e6);
    }

    registerPluginCallbacks(ref) {
        if (!ref) return;
        const { dragSelect, zoomPan } = ref.chart_instance;
        this.onChartSizeUpdate(ref.chart_instance);
        dragSelect.callback = this.dragSelectCallback;
        zoomPan.callback = this.zoomPanCallback;
    }

    dragSelectCallback(cursorBegin, cursorEnd) {
        const { chartCursor } = this.props;
        this.recalculate(cursorBegin, cursorEnd);
        chartCursor(cursorBegin, cursorEnd);
    }

    zoomPanCallback(beginX, endX, beginY, endY) {
        const { chartWindow, chartReset, options, windowDuration } = this.props;

        if (typeof beginX === 'undefined') {
            chartReset(windowDuration);
            return;
        }

        const earliestDataTime =
            options.timestamp - ((options.data.length / options.samplesPerSecond) * 1e6);
        const windowBegin = Math.max(earliestDataTime, beginX);
        const windowEnd = Math.min(options.timestamp, endX);

        chartWindow(windowBegin, windowEnd, beginY, endY);
    }

    chartPause() {
        const { chartWindow, options, windowDuration } = this.props;
        chartWindow(options.timestamp - windowDuration, options.timestamp);
    }

    resizeLength(len) {
        this.len = len;
        this.lineData = new Array(this.len * 2);
    }

    calculateLineDataSets() {
        const {
            options, cursorBegin,
            windowBegin, windowEnd, windowDuration,
        } = this.props;

        this.end = windowEnd || options.timestamp;
        this.begin = windowBegin || (this.end - windowDuration);

        const originalIndexBegin = this.timestampToIndex(this.begin);
        const originalIndexEnd = this.timestampToIndex(this.end);
        const step = (originalIndexEnd - originalIndexBegin) / this.len;

        if (step > 1) {
            for (let mappedIndex = 0, originalIndex = originalIndexBegin;
                mappedIndex < this.len;
                mappedIndex = mappedIndex + 1, originalIndex = originalIndex + step) {
                const timestamp = this.begin + (windowDuration * (mappedIndex / this.len));
                const k = Math.floor(originalIndex);
                const l = Math.floor(originalIndex + step);
                let min = Number.MAX_VALUE;
                let max = -Number.MAX_VALUE;
                for (let n = k; n < l; n = n + 1) {
                    const v = options.data[(n + options.data.length) % options.data.length];
                    if (v !== undefined) {
                        if (v > max) max = v;
                        if (v < min) min = v;
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
            }
            for (; mappedIndex < this.len + this.len; mappedIndex = mappedIndex + 1) {
                this.lineData[mappedIndex] = undefined;
            }
        }

        if (cursorBegin === null) {
            this.recalculate(this.begin, this.end);
        }

        return step;
    }

    recalculate(from, to) {
        const { options } = this.props;
        this.calcDelta = to - from;

        const calcIndexBegin = Math.ceil(this.timestampToIndex(from));
        const calcIndexEnd = Math.floor(this.timestampToIndex(to));

        let calcSum = 0;
        let calcLen = 0;
        this.calcMax = 0;

        for (let n = calcIndexBegin; n <= calcIndexEnd; n = n + 1) {
            const k = (n + options.data.length) % options.data.length;
            const v = options.data[k];
            if (v !== undefined) {
                if (v > this.calcMax) this.calcMax = v;
                calcSum = calcSum + v;
                calcLen = calcLen + 1;
            }
        }

        this.calcAvg = calcSum / (calcLen || 1);
    }

    renderStats() {
        const { cursorBegin } = this.props;
        const renderValue = (label, value, unit) => {
            const v = math.unit(value, unit).format({ notation: 'fixed', precision: 3 });
            const [valStr, unitStr] = v.split(' ');
            return <span>{label}: <b>{valStr}</b> {unitStr.replace('u', '\u00B5')}</span>;
        };
        const charge = this.calcAvg * ((this.calcDelta || 1) / 1e6);
        return (
            <div className="chart-stats">
                { renderValue(`${cursorBegin !== null ? 'marker' : 'window'} \u0394`, this.calcDelta, 'us') }
                { renderValue('avg', this.calcAvg, 'uA') }
                { renderValue('max', this.calcMax, 'uA') }
                { renderValue('charge', charge, 'uC') }
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

    renderResetButton() {
        const { averageRunning, canReset, windowBegin, windowEnd } = this.props;
        if (averageRunning !== null) {
            const live = (windowBegin === 0) && (windowEnd === 0);
            return (
                <Button
                    bsStyle="primary"
                    bsSize="small"
                    disabled={!averageRunning && live}
                    onClick={live ? this.chartPause : this.chartResetToLive}
                    title={live ? 'Pause' : 'Live'}
                >
                    <Glyphicon glyph={live ? 'pause' : 'step-forward'} />
                </Button>
            );
        }
        return (
            <Button
                bsStyle="primary"
                bsSize="small"
                disabled={!canReset}
                onClick={this.chartResetToLive}
                title="Reset & Live"
            >
                <Glyphicon glyph="repeat" />
            </Button>
        );
    }

    render() {
        const step = this.calculateLineDataSets();

        const {
            id,
            options,
            cursorBegin,
            cursorEnd,
            bufferLength,
            yMin,
            yMax,
            canReset,
        } = this.props;
        const chartCursorActive = ((cursorBegin !== null) || (cursorEnd !== null));
        const chartData = {
            datasets: [{
                borderColor: options.color,
                borderWidth: 1,
                fill: false,
                data: this.lineData.slice(),
                pointRadius: step > 0.2 ? 0 : 1.5,
                pointHoverRadius: 0,
                pointHitRadius: 0,
                pointBackgroundColor: options.color,
                pointBorderWidth: 0,
                lineTension: step > 0.2 ? 0 : 0.2,
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
                    fullWidth: 60,
                    ticks: {
                        suggestedMin: options.valueRange.min,
                        suggestedMax: options.valueRange.max,
                        min: yMin === null ? options.valueRange.min : yMin,
                        max: yMax === null ? undefined : yMax,
                        maxTicksLimit: 7,
                        callback: (uA => (
                            math.unit(uA, 'uA')
                            .format({ notation: 'fixed', precision: 3 })
                            .replace('u', '\u00B5')
                        )),
                    },
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
                        ref={this.registerPluginCallbacks}
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
                            disabled={!chartCursorActive || !canReset}
                            bsSize="small"
                            onClick={this.resetCursor}
                            title={chartCursorActive ? 'Clear Marker' : 'Hold shift + click and drag to select an area'}
                        >
                            <Glyphicon glyph="erase" />
                        </Button>
                        {this.renderResetButton()}
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
    yMin: null,
    yMax: null,
    canReset: true,
    cursorBegin: null,
    cursorEnd: null,
};

Chart.propTypes = {
    chartWindow: PropTypes.func.isRequired,
    chartReset: PropTypes.func.isRequired,
    chartCursor: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    cursorBegin: PropTypes.number,
    cursorEnd: PropTypes.number,
    windowBegin: PropTypes.number.isRequired,
    windowEnd: PropTypes.number.isRequired,
    windowDuration: PropTypes.number.isRequired,
    yMin: PropTypes.number,
    yMax: PropTypes.number,
    index: PropTypes.number.isRequired,
    bufferLength: PropTypes.number,
    bufferRemaining: PropTypes.number,
    averageRunning: PropTypes.bool,
    canReset: PropTypes.bool,
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
