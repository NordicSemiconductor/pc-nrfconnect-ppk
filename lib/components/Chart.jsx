/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
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

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { defaults, Line } from 'react-chartjs-2';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { unit } from 'mathjs';

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

const Chart = ({
    options,
    index,
    chartCursor,
    chartWindow,
    chartReset,
    windowBegin,
    windowEnd,
    windowDuration,
    bufferLength,
    bufferRemaining,
    averageRunning,
    canReset,
    cursorBegin,
    cursorEnd,
    yMin,
    yMax,
}) => {
    const end = windowEnd || options.timestamp;
    const begin = windowBegin || (end - windowDuration);

    const [from, to] = (cursorBegin === null) ? [begin, end] : [cursorBegin, cursorEnd];

    const [lineData, setLineData] = useState([]);
    const len = lineData.length / 2;

    const onChartSizeUpdate = instance => {
        const { left, right } = instance.chart.chartArea;
        const width = Math.trunc(right - left);
        if (len === width) {
            return;
        }
        setLineData(new Array(width + width));
    };

    const timestampToIndex = ts => (
        index - (((options.timestamp - ts) * options.samplesPerSecond) / 1e6)
    );

    const calcIndexBegin = Math.ceil(timestampToIndex(from));
    const calcIndexEnd = Math.floor(timestampToIndex(to));

    let calcSum = 0;
    let calcLen = 0;
    let calcMax = 0;

    for (let n = calcIndexBegin; n <= calcIndexEnd; n += 1) {
        const k = (n + options.data.length) % options.data.length;
        const v = options.data[k];
        if (!Number.isNaN(v)) {
            if (v > calcMax) {
                calcMax = v;
            }
            calcSum += v;
            calcLen += 1;
        }
    }

    const calcDelta = to - from;
    const calcAvg = calcSum / (calcLen || 1);

    const zoomPanCallback = (beginX, endX, beginY, endY) => {
        if (typeof beginX === 'undefined') {
            chartReset(windowDuration);
            return;
        }

        const earliestDataTime = options.timestamp
            - ((options.data.length / options.samplesPerSecond) * 1e6);

        chartWindow(
            Math.max(earliestDataTime, beginX),
            Math.min(options.timestamp, endX), beginY, endY,
        );
    };

    const chartRef = useCallback(node => {
        if (!node) return;
        const { dragSelect, zoomPan } = node.chartInstance;
        onChartSizeUpdate(node.chartInstance);
        dragSelect.callback = chartCursor;
        zoomPan.callback = zoomPanCallback;
    }, []);

    const chartResetToLive = () => zoomPanCallback(undefined, undefined);
    const resetCursor = () => chartCursor(null, null);
    const chartPause = () => chartWindow(
        options.timestamp - windowDuration, options.timestamp,
    );

    const originalIndexBegin = timestampToIndex(begin);
    const originalIndexEnd = timestampToIndex(end);
    const step = (originalIndexEnd - originalIndexBegin) / len;

    if (step > 1) {
        for (let mappedIndex = 0, originalIndex = originalIndexBegin;
            mappedIndex < len;
            mappedIndex = mappedIndex + 1, originalIndex = originalIndex + step) {
            const timestamp = begin + (windowDuration * (mappedIndex / len));
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
            lineData[mappedIndex * 2] = { x: timestamp, y: min };
            lineData[(mappedIndex * 2) + 1] = { x: timestamp, y: max };
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
            const timestamp = begin
                + (((n - originalIndexBegin) * 1e6) / options.samplesPerSecond);
            lineData[mappedIndex] = { x: timestamp, y: v };
        }
        for (; mappedIndex < lineData.length; mappedIndex = mappedIndex + 1) {
            lineData[mappedIndex] = undefined;
        }
    }

    const renderValue = (label, value, unitArg) => {
        const v = unit(value, unitArg).format({ notation: 'fixed', precision: 3 });
        const [valStr, unitStr] = v.split(' ');
        return <span>{label}: <b>{valStr}</b> {unitStr.replace('u', '\u00B5')}</span>;
    };

    const renderResetButton = () => {
        if (averageRunning !== null) {
            const live = (windowBegin === 0) && (windowEnd === 0);
            return (
                <Button
                    variant="primary"
                    size="sm"
                    disabled={!averageRunning && live}
                    onClick={live ? chartPause : chartResetToLive}
                    title={live ? 'Pause' : 'Live'}
                >
                    <span className={`mdi mdi-${live ? 'pause' : 'step-forward'}`} />
                </Button>
            );
        }
        return (
            <Button
                variant="primary"
                size="sm"
                disabled={!canReset}
                onClick={chartResetToLive}
                title="Reset & Live"
            >
                <span className="mdi mdi-repeat" />
            </Button>
        );
    };

    const chartCursorActive = ((cursorBegin !== null) || (cursorEnd !== null));
    const chartData = {
        datasets: [{
            borderColor: options.color,
            borderWidth: 1,
            fill: false,
            data: lineData,
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
                min: begin,
                max: end,
                ticks: {
                    maxRotation: 0,
                    autoSkipPadding: 25,
                    min: begin,
                    max: end,
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
                        unit(uA, 'uA')
                            .format({ notation: 'fixed', precision: 3 })
                            .replace('u', '\u00B5')
                    )),
                },
            }],
        },
        redraw: true,
        maintainAspectRatio: false,
        onResize: onChartSizeUpdate,
    };

    return (
        <div className="chart-outer">
            <div className="chart-top">
                <span>
                    Buffer:&nbsp;
                    {bufferRemaining > 0 ? (
                        <ProgressBar
                            max={bufferLength}
                            now={bufferRemaining}
                            label={`${Number((bufferRemaining / 1e6)).toFixed(1)} s`}
                            animated={averageRunning}
                            key={2}
                        />
                    ) : (
                        <ProgressBar className="full" label="FULL" max={1} now={1} />
                    )}
                </span>
            </div>
            <div className="chart-container">
                <Line
                    ref={chartRef}
                    data={chartData}
                    options={chartOptions}
                    update={options.update}
                />
            </div>
            <div className="chart-bottom">
                <div className="chart-stats">
                    {renderValue(`${cursorBegin !== null ? 'marker' : 'window'} \u0394`, calcDelta, 'us')}
                    {renderValue('avg', calcAvg, 'uA')}
                    {renderValue('max', calcMax, 'uA')}
                    {renderValue('charge', calcAvg * ((calcDelta || 1) / 1e6), 'uC')}
                </div>
                <ButtonGroup>
                    <Button
                        variant="primary"
                        disabled={!chartCursorActive || !canReset}
                        size="sm"
                        onClick={resetCursor}
                        title={chartCursorActive ? 'Clear Marker' : 'Hold shift + click and drag to select an area'}
                    >
                        <span className="mdi mdi-eraser" />
                    </Button>
                    {renderResetButton()}
                </ButtonGroup>
            </div>
        </div>
    );
};

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
        data: PropTypes.instanceOf(Float32Array),
        index: PropTypes.number,
        timestamp: PropTypes.number,
        samplesPerSecond: PropTypes.number,
        color: PropTypes.string,
        valueRange: PropTypes.objectOf(PropTypes.number),
        update: PropTypes.number,
    }).isRequired,
};

export default Chart;
