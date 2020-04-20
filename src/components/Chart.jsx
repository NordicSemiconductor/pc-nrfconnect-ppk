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

/* eslint no-bitwise: off */

import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { defaults, Line } from 'react-chartjs-2';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { unit } from 'mathjs';

import annotationPlugin from 'chartjs-plugin-annotation';
import dragSelectPlugin from '../utils/chart.dragSelect';
import zoomPanPlugin from '../utils/chart.zoomPan';

import {
    chartWindowAction,
    chartCursorAction,
    chartState,
} from '../reducers/chartReducer';

import { options } from '../globals';

defaults.global.tooltips.enabled = false;
defaults.global.legend.display = true;
defaults.global.animation.duration = 0;

const dataColor = '#B32860';
const valueRange = { min: 0, max: 15000 };

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

const allOfBits = 8;

const emptyArray = () => [...Array(4000)].map(() => ({ x: undefined, y: undefined }));
const lineData = emptyArray();
const bits = [...Array(allOfBits)].map(() => emptyArray());
const bitIndexes = new Array(allOfBits);

const Chart = () => {
    const dispatch = useDispatch();
    const chartWindow = (windowBegin, windowEnd, yMin, yMax) => dispatch(
        chartWindowAction(
            windowBegin, windowEnd, windowEnd - windowBegin, yMin, yMax,
        ),
    );
    const chartReset = windowDuration => dispatch(
        chartWindowAction(null, null, windowDuration, undefined, undefined),
    );
    const chartCursor = (cursorBegin, cursorEnd) => dispatch(
        chartCursorAction(cursorBegin, cursorEnd),
    );
    const {
        windowBegin,
        windowEnd,
        windowDuration,
        bufferLength,
        bufferRemaining,
        samplingRunning,
        canReset,
        cursorBegin,
        cursorEnd,
        yMin,
        yMax,
        index,
    } = useSelector(chartState);

    const chartRef = useRef(null);
    let numberOfBits = (windowDuration < 30000000) ? allOfBits : 0;
    if (!options.bits) {
        numberOfBits = 0;
    }

    const end = windowEnd || options.timestamp;
    const begin = windowBegin || (end - windowDuration);

    const [from, to] = (cursorBegin === null) ? [begin, end] : [cursorBegin, cursorEnd];
    const [len, setLen] = useState(0);

    const onChartSizeUpdate = instance => {
        const { left, right } = instance.chart.chartArea;
        const width = Math.trunc(right - left);
        setLen(Math.min(width, 2000));
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

    useEffect(() => {
        if (!chartRef.current.chartInstance) {
            return;
        }

        const { dragSelect, zoomPan } = chartRef.current.chartInstance;
        onChartSizeUpdate(chartRef.current.chartInstance);
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

    let mappedIndex = 0;
    bitIndexes.fill(0);
    for (let i = 0; i < numberOfBits; i += 1) {
        bits[i][0] = { x: undefined, y: undefined };
    }
    if (step > 1) {
        for (let originalIndex = originalIndexBegin;
            mappedIndex < len + len;
            mappedIndex += 1, originalIndex += step) {
            const timestamp = begin + (windowDuration * (mappedIndex / (len + len)));
            const k = Math.floor(originalIndex);
            const l = Math.floor(originalIndex + step);
            let min = Number.MAX_VALUE;
            let max = -Number.MAX_VALUE;
            for (let n = k; n < l; n += 1) {
                const v = options.data[(n + options.data.length) % options.data.length];
                if (!Number.isNaN(v)) {
                    if (v > max) max = v;
                    if (v < min) min = v;
                }
            }

            if (min > max) {
                min = undefined;
                max = undefined;
            }
            lineData[mappedIndex].x = timestamp;
            lineData[mappedIndex].y = min;
            mappedIndex += 1;
            lineData[mappedIndex].x = timestamp;
            lineData[mappedIndex].y = max;

            for (let i = 0; i < numberOfBits; i += 1) {
                let y1;
                for (let n = k; n < l; n += 1) {
                    const ni = (n + options.data.length) % options.data.length;
                    const v = Number.isNaN(options.data[ni])
                        ? undefined
                        : (((options.bits[ni] >> i) & 1) + (i * 2));
                    if (v !== undefined && (y1 === undefined || v !== y1)) {
                        if ((bits[i][bitIndexes[i] - 1] || {}).y !== v
                            || mappedIndex === len + len - 1) {
                            bits[i][bitIndexes[i]].x = timestamp;
                            bits[i][bitIndexes[i]].y = v;
                            bitIndexes[i] += 1;
                        }
                        if (y1 !== undefined) {
                            break;
                        }
                        y1 = v;
                    }
                }
            }
        }
    } else {
        const originalIndexBeginFloored = Math.floor(originalIndexBegin);
        const originalIndexEndCeiled = Math.ceil(originalIndexEnd);
        for (let n = originalIndexBeginFloored;
            n <= originalIndexEndCeiled;
            mappedIndex += 1, n += 1) {
            const k = (n + options.data.length) % options.data.length;
            const v = options.data[k];
            const timestamp = begin
                + (((n - originalIndexBegin) * 1e6) / options.samplesPerSecond);
            lineData[mappedIndex].x = timestamp;
            lineData[mappedIndex].y = Number.isNaN(v) ? undefined : v;

            for (let i = 0; i < numberOfBits; i += 1) {
                const y = Number.isNaN(options.data[k])
                    ? undefined
                    : ((options.bits[k] >> i) & 1) + (i * 2);
                if ((bits[i][bitIndexes[i] - 1] || {}).y !== y || n === originalIndexEndCeiled) {
                    bits[i][bitIndexes[i]].x = timestamp;
                    bits[i][bitIndexes[i]].y = y;
                    bitIndexes[i] += 1;
                }
            }
        }
    }

    const renderValue = (label, value, unitArg) => {
        const v = unit(value, unitArg).format({ notation: 'fixed', precision: 3 });
        const [valStr, unitStr] = v.split(' ');
        return <span>{label}: <b>{valStr}</b> {unitStr.replace('u', '\u00B5')}</span>;
    };

    const renderResetButton = () => {
        if (samplingRunning !== null) {
            const live = (windowBegin === 0) && (windowEnd === 0);
            return (
                <Button
                    variant="primary"
                    size="sm"
                    disabled={!samplingRunning && live}
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

    const bitColors = [
        '#005588', '#008855', '#005555',
        '#008888', '#660088', '#0055FF',
        '#00C288', '#0F2088',
    ].slice(0, numberOfBits);

    const bitLabels = [
        'LAP0', 'LAP1', 'LAP2', 'LAP3', 'LAP4', 'LAP5', 'LAP6', 'LAP7',
    ].slice(0, numberOfBits);

    const bitsDataSets = bits.slice(0, numberOfBits).map((b, i) => ({
        borderColor: bitColors[i],
        borderWidth: 0.5,
        fill: false,
        data: b.slice(0, bitIndexes[i]),
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        pointBorderWidth: 0,
        lineTension: 0,
        label: bitLabels[i],
        yAxisID: 'bits-axis',
        steppedLine: 'before',
    }));

    const bitsAxis = [{
        id: 'bits-axis',
        type: 'linear',
        min: 0,
        max: 15,
        position: 'right',
        ticks: {
            autoSkip: false,
            min: -1,
            max: 16,
            labelOffset: 0,
            minRotation: 90,
            maxRotation: 90,
            callback: (n => bitLabels[n / 2]),
        },
        gridLines: {
            display: false,
        },
    }];

    const chartData = {
        datasets: [{
            borderColor: dataColor,
            borderWidth: 1,
            fill: false,
            data: lineData.slice(0, mappedIndex),
            pointRadius: step > 0.2 ? 0 : 1.5,
            pointHoverRadius: 0,
            pointHitRadius: 0,
            pointBackgroundColor: dataColor,
            pointBorderWidth: 0,
            lineTension: step > 0.2 ? 0 : 0.2,
            label: 'Current',
            yAxisID: 'yScale',
            showLines: false,
        }, ...bitsDataSets],
    };

    const chartOptions = {
        scales: {
            xAxes: [{
                id: 'xScale',
                type: 'linear',
                min: begin,
                max: end,
                ticks: {
                    minRotation: 0,
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
            yAxes: [
                {
                    id: 'yScale',
                    type: 'linear',
                    min: valueRange.min,
                    max: valueRange.max,
                    fullWidth: 60,
                    ticks: {
                        minRotation: 0,
                        maxRotation: 0,
                        suggestedMin: valueRange.min,
                        suggestedMax: valueRange.max,
                        min: yMin === null ? valueRange.min : yMin,
                        max: yMax === null ? undefined : yMax,
                        maxTicksLimit: 7,
                        callback: (uA => (
                            unit(uA, 'uA')
                                .format({ notation: 'fixed', precision: 3 })
                                .replace('u', '\u00B5')
                        )),
                    },
                },
                ...bitsAxis,
            ],
        },
        redraw: true,
        maintainAspectRatio: false,
        onResize: onChartSizeUpdate,
        animation: {
            duration: 0,
        },
        hover: {
            animationDuration: 0,
        },
        responsiveAnimationDuration: 0,
        annotation: options.triggerMarkers ? {
            drawTime: 'beforeDatasetsDraw',
            annotations: options.triggerMarkers.map(marker => ({
                type: 'line',
                mode: 'vertical',
                scaleID: 'xScale',
                value: marker - options.samplingTime,
                borderColor: 'rgba(100%, 80%, 0%, 50%)',
                borderWidth: 1,
            })),
        } : undefined,
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
                            animated={samplingRunning}
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
                    plugins={[dragSelectPlugin, zoomPanPlugin, annotationPlugin]}
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
                        disabled={!chartCursorActive}
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

export default Chart;
