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
/* eslint no-plusplus: off */
/* eslint operator-assignment: off */

import React, { useState, useRef, useEffect, useCallback } from 'react';
<<<<<<< HEAD
=======
import { bool } from 'prop-types';
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
import { useDispatch, useSelector } from 'react-redux';
import { Line } from 'react-chartjs-2';
import Button from 'react-bootstrap/Button';
import { unit } from 'mathjs';

import dragSelectPlugin from './plugins/chart.dragSelect';
import zoomPanPlugin from './plugins/chart.zoomPan';
import crossHairPlugin from './plugins/chart.crossHair';
import triggerLevelPlugin from './plugins/chart.triggerLevel';
import triggerRangePlugin from './plugins/chart.triggerRange';

import ChartTop from './ChartTop';
import BufferView from './BufferView';
import StatBox from './StatBox';
import TimeSpan from './TimeSpan';

import {
    chartWindowAction,
    chartCursorAction,
    chartState,
} from '../../reducers/chartReducer';
import { triggerState } from '../../reducers/triggerReducer';
import { appState } from '../../reducers/appReducer';

import { options, timestampToIndex, nbDigitalChannels } from '../../globals';

import { yAxisWidthPx, rightMarginPx } from './chart.scss';
import colors from '../colors.scss';
import { updateTriggerLevel } from '../../actions/deviceActions';

const yAxisWidth = parseInt(yAxisWidthPx, 10);
const rightMargin = parseInt(rightMarginPx, 10);

const dataColor = colors.nordicBlue;
const valueRange = { min: 0, max: undefined };

const timestampToLabel = (usecs, index, array) => {
    const microseconds = Math.abs(usecs);
    const sign = usecs < 0 ? '-' : '';
    if (!array) {
        return `${sign}${Number(microseconds / 1e3).toFixed(3)} ms`;
    }
    if (index > 0 && index < array.length - 1) {
        const first = array[0];
        const last = array[array.length - 1];
        const range = last - first;
        if (usecs - first < range / 8 || last - usecs < range / 8) {
            return undefined;
        }
    }

    const d = new Date(microseconds / 1e3);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    const s = d.getUTCSeconds().toString().padStart(2, '0');

    const time = `${sign}${h}:${m}:${s}`;
    const subsecond = `${Number((microseconds / 1e3) % 1e3).toFixed(
        3
    )}`.padStart(7, '0');

    return [time, subsecond];
};

const formatCurrent = uA =>
    unit(uA, 'uA')
        .format({ notation: 'auto', precision: 4 })
        .replace('u', '\u00B5');

const emptyArray = () =>
    [...Array(4000)].map(() => ({ x: undefined, y: undefined }));
<<<<<<< HEAD
const lineData = emptyArray();
const bitsData = [...Array(nbDigitalChannels)].map(() => emptyArray());
const bitIndexes = new Array(nbDigitalChannels);
const lastBits = new Array(nbDigitalChannels);
=======
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger

const bitsChartOptions = {
    scales: {
        xAxes: [
            {
                id: 'xScale',
                display: false,
                type: 'linear',
                ticks: {},
                tickMarkLength: 0,
                drawTicks: false,
                cursor: {},
            },
        ],
        yAxes: [
            {
                type: 'linear',
                display: false,
                ticks: {
                    min: -0.5,
                    max: 0.5,
                },
            },
        ],
    },
    redraw: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    hover: { animationDuration: 0 },
    responsiveAnimationDuration: 0,
    legend: { display: false },
};

const calcStats = (data, begin, end, index) => {
    if (begin === null || end === null) {
        return null;
    }
    const indexBegin = Math.ceil(timestampToIndex(begin, index));
    const indexEnd = Math.floor(timestampToIndex(end, index));

    let sum = 0;
    let len = 0;
    let max;

    for (let n = indexBegin; n <= indexEnd; ++n) {
        const k = (n + data.length) % data.length;
        const v = data[k];
        if (!Number.isNaN(v)) {
            if (max === undefined || v > max) {
                max = v;
            }
            sum = sum + v;
            ++len;
        }
    }
    return {
        average: sum / (len || 1),
        max,
        delta: end - begin,
    };
};

<<<<<<< HEAD
const Chart = () => {
=======
const Chart = ({ digitalChannelsEnabled = false }) => {
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
    const dispatch = useDispatch();
    const chartWindow = useCallback(
        (windowBegin, windowEnd, yMin, yMax) =>
            dispatch(
                chartWindowAction(
                    windowBegin,
                    windowEnd,
                    windowEnd - windowBegin,
                    yMin,
                    yMax
                )
            ),
        [dispatch]
    );
    const chartReset = useCallback(
        windowDuration =>
            dispatch(
                chartWindowAction(
                    null,
                    null,
                    windowDuration,
                    undefined,
                    undefined
                )
            ),
        [dispatch]
    );
    const chartCursor = useCallback(
        (cursorBegin, cursorEnd) =>
            dispatch(chartCursorAction(cursorBegin, cursorEnd)),
        [dispatch]
    );
    const {
        windowBegin,
        windowEnd,
        windowDuration,
        cursorBegin,
        cursorEnd,
        yMin,
        yMax,
        digitalChannels,
        digitalChannelsVisible,
        timestampsVisible,
        hasDigitalChannels,
        triggerHandleVisible,
    } = useSelector(chartState);
<<<<<<< HEAD
=======
    const showDigitalChannels =
        digitalChannelsVisible && digitalChannelsEnabled;
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
    const {
        triggerLevel,
        triggerRunning,
        triggerSingleWaiting,
        externalTrigger,
    } = useSelector(triggerState);
    const { samplingRunning } = useSelector(appState);
    const { index } = options;

    const sendTriggerLevel = level => dispatch(updateTriggerLevel(level));

    const chartRef = useRef(null);

<<<<<<< HEAD
    const { data, bits } = options;

    let numberOfBits = windowDuration <= 3000000 ? nbDigitalChannels : 0;
=======
    const [lineData] = useState(emptyArray());
    const [bitsData] = useState(
        [...Array(nbDigitalChannels)].map(() => emptyArray())
    );
    const [bitIndexes] = useState(new Array(nbDigitalChannels));
    const [lastBits] = useState(new Array(nbDigitalChannels));

    const { data, bits } = options;

    let numberOfBits =
        windowDuration <= 3000000 && showDigitalChannels
            ? nbDigitalChannels
            : 0;
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
    if (!bits) {
        numberOfBits = 0;
    }

    const end = windowEnd || options.timestamp - options.samplingTime;
    const begin = windowBegin || end - windowDuration;

    const [len, setLen] = useState(0);
    const [chartAreaWidth, setChartAreaWidth] = useState(0);

    const windowStats = calcStats(data, begin, end, index);
    const selectionStats = calcStats(data, cursorBegin, cursorEnd, index);

    const resetCursor = useCallback(() => chartCursor(null, null), [
        chartCursor,
    ]);

    const zoomPanCallback = useCallback(
        (beginX, endX, beginY, endY) => {
            if (typeof beginX === 'undefined') {
                chartReset(windowDuration);
                resetCursor();
                return;
            }

            const earliestDataTime =
                options.timestamp -
                (data.length / options.samplesPerSecond) * 1e6;

            const p0 = Math.max(0, earliestDataTime - beginX);
            const p1 = Math.max(0, endX - options.timestamp);

            if (p0 * p1 === 0) {
                chartWindow(beginX - p1 + p0, endX - p1 + p0, beginY, endY);
            }
        },
        [chartReset, chartWindow, data.length, windowDuration, resetCursor]
    );

    const zoomToWindow = useCallback(
        usec => {
            if (windowEnd) {
                const mid = (windowBegin + windowEnd) / 2;
                let a = mid - usec / 2;
                let b = mid + usec / 2;
                if (b > windowEnd) {
                    a = a - (b - windowEnd);
                    b = windowEnd;
                }
                chartWindow(a, b);
                return;
            }
            chartReset(usec);
        },
        [chartWindow, chartReset, windowBegin, windowEnd]
    );

    useEffect(() => {
        if (!chartRef.current.chartInstance) {
            return;
        }
        const { dragSelect, zoomPan } = chartRef.current.chartInstance;
        dragSelect.callback = chartCursor;
        zoomPan.callback = zoomPanCallback;
    }, [chartCursor, zoomPanCallback]);

    const chartResetToLive = () => zoomPanCallback(undefined, undefined);
    const chartPause = () =>
        chartWindow(options.timestamp - windowDuration, options.timestamp);

    const originalIndexBegin = timestampToIndex(begin, index);
    const originalIndexEnd = timestampToIndex(end, index);
    const step = (originalIndexEnd - originalIndexBegin) / len;

    let mappedIndex = 0;
    bitIndexes.fill(0);

    for (let i = 0; i < numberOfBits; ++i) {
        bitsData[i][0] = { x: undefined, y: undefined };
    }
    if (step > 1) {
        for (
            let originalIndex = originalIndexBegin;
            mappedIndex < len + len;
            ++mappedIndex, originalIndex = originalIndex + step
        ) {
            const timestamp =
                begin + windowDuration * (mappedIndex / (len + len));
            const k = Math.floor(originalIndex);
            const l = Math.floor(originalIndex + step);
            let min = Number.MAX_VALUE;
            let max = -Number.MAX_VALUE;
            for (let n = k; n < l; ++n) {
                const v = data[(n + data.length) % data.length];
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
            ++mappedIndex;
            lineData[mappedIndex].x = timestamp;
            lineData[mappedIndex].y = max;

            for (let i = 0; i < numberOfBits; ++i) {
                let y1;
                for (let n = k; n < l; ++n) {
                    const ni = (n + data.length) % data.length;
                    if (!Number.isNaN(data[ni])) {
                        const v = (((bits[ni] >> i) & 1) - 0.5) * 0.8;
                        if (y1 === undefined || v !== y1) {
                            if (
                                (bitsData[i][bitIndexes[i] - 1] || {}).y !==
                                    v ||
                                mappedIndex === len + len - 1
                            ) {
                                bitsData[i][bitIndexes[i]].x = timestamp;
                                bitsData[i][bitIndexes[i]].y = v;
                                ++bitIndexes[i];
                            }
                            if (y1 !== undefined) {
                                break;
                            }
                            y1 = v;
                        }
                    }
                }
            }
        }
    } else {
        lastBits.fill(undefined);
        let last;
        const originalIndexBeginFloored = Math.floor(originalIndexBegin);
        const originalIndexEndCeiled = Math.ceil(originalIndexEnd);
        for (
            let n = originalIndexBeginFloored;
            n <= originalIndexEndCeiled;
            ++mappedIndex, ++n
        ) {
            const k = (n + data.length) % data.length;
            const v = data[k];
            const timestamp =
                begin +
                ((n - originalIndexBegin) * 1e6) / options.samplesPerSecond;
            lineData[mappedIndex].x = timestamp;
            if (n < originalIndexEndCeiled) {
                last = Number.isNaN(v) ? undefined : v;
            }
            lineData[mappedIndex].y = last;

            for (let i = 0; i < numberOfBits; ++i) {
                const y = Number.isNaN(v)
                    ? undefined
                    : (((bits[k] >> i) & 1) - 0.5) * 0.8;
                bitsData[i][bitIndexes[i]].x = timestamp;
                if (n === originalIndexEndCeiled) {
                    bitsData[i][bitIndexes[i]].y = lastBits[i];
                    ++bitIndexes[i];
                } else if ((bitsData[i][bitIndexes[i] - 1] || {}).y !== y) {
                    bitsData[i][bitIndexes[i]].y = y;
                    lastBits[i] = y;
                    ++bitIndexes[i];
                }
            }
        }
    }

    const chartCursorActive = cursorBegin !== null || cursorEnd !== null;

    const bitsChartData = bitsData
        .map((b, i) => ({
            datasets: [
                {
                    borderColor: dataColor,
                    borderWidth: 1.5,
                    fill: false,
                    data: b.slice(0, bitIndexes[i]),
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 0,
                    pointBorderWidth: 0,
                    lineTension: 0,
                    label: `${i}`,
                    steppedLine: 'before',
                },
            ],
        }))
        .filter((_, i) => digitalChannels[i]);

    const live =
        windowBegin === 0 &&
        windowEnd === 0 &&
        (samplingRunning || triggerRunning || triggerSingleWaiting);
    const snapping = step <= 0.16 && !live;

    const pointRadius = step <= 0.08 ? 4 : 2;

    const chartData = {
        datasets: [
            {
                borderColor: dataColor,
                borderWidth: step > 2 ? 1 : 1.5,
                fill: false,
                data: lineData.slice(0, mappedIndex),
                pointRadius: snapping ? pointRadius : 0,
                pointHoverRadius: snapping ? pointRadius : 0,
                pointHitRadius: snapping ? pointRadius : 0,
                pointBackgroundColor: colors.white,
                pointHoverBackgroundColor: dataColor,
                pointBorderWidth: 1.5,
                pointHoverBorderWidth: 1.5,
                pointBorderColor: dataColor,
                pointHoverBorderColor: dataColor,
                lineTension: snapping ? 0.2 : 0,
                label: 'Current',
                yAxisID: 'yScale',
                labelCallback: ({ y }) => formatCurrent(y),
            },
        ],
    };

    const chartOptions = {
        scales: {
            xAxes: [
                {
                    id: 'xScale',
                    type: 'linear',
                    display: true,
                    ticks: {
                        display: timestampsVisible,
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
                        drawOnChartArea: true,
                    },
                    cursor: { cursorBegin, cursorEnd },
                afterFit: scale => { scale.paddingRight = rightMargin; }, // eslint-disable-line
                },
            ],
            yAxes: [
                {
                    id: 'yScale',
                    type: 'linear',
                    ticks: {
                        minRotation: 0,
                        maxRotation: 0,
                        min: yMin === null ? valueRange.min : yMin,
                        max: yMax === null ? valueRange.max : yMax,
                        maxTicksLimit: 7,
                        padding: 0,
                        callback: uA => (uA < 0 ? '' : formatCurrent(uA)),
                    },
                    gridLines: {
                        display: true,
                        drawBorder: true,
                        drawOnChartArea: true,
                    },
                afterFit: scale => { scale.width = yAxisWidth; }, // eslint-disable-line
                },
            ],
        },
        redraw: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        hover: { animationDuration: 0 },
        responsiveAnimationDuration: 0,
        tooltips: { enabled: false },
        legend: { display: false },
        formatX: timestampToLabel,
        formatY: formatCurrent,
        triggerLevel,
        triggerActive: triggerRunning || triggerSingleWaiting,
        sendTriggerLevel,
        snapping,
        live,
        triggerHandleVisible: triggerHandleVisible && !externalTrigger,
    };

    const bitXaxis = bitsChartOptions.scales.xAxes[0];
    bitXaxis.ticks.min = begin;
    bitXaxis.ticks.max = end;
    bitXaxis.cursor.cursorBegin = cursorBegin;
    bitXaxis.cursor.cursorEnd = cursorEnd;

    return (
        <div className="chart-outer">
            <div className="chart-current">
                <ChartTop
                    chartPause={chartPause}
                    chartResetToLive={chartResetToLive}
                    zoomToWindow={zoomToWindow}
                    chartRef={chartRef}
                />
                <BufferView width={chartAreaWidth} />
                <TimeSpan width={chartAreaWidth + 1} className="window" />
                <div className="chart-container">
                    <Line
                        ref={chartRef}
                        data={chartData}
                        options={chartOptions}
                        plugins={[
                            dragSelectPlugin,
                            zoomPanPlugin,
                            triggerLevelPlugin,
                            crossHairPlugin,
                            triggerRangePlugin,
                            {
                                id: 'notifier',
                                afterLayout(chart) {
                                    const { chartArea, width } = chart;
                                    chartArea.right = width - rightMargin;
                                    const { left, right } = chart.chartArea;
                                    const w = Math.trunc(right - left);
                                    setLen(Math.min(w, 2000));
                                    setChartAreaWidth(w);
                                },
                            },
                        ]}
                    />
                </div>
                <TimeSpan
                    cursorBegin={cursorBegin}
                    cursorEnd={cursorEnd}
                    width={chartAreaWidth + 1}
                    className="selection"
                />
                <div
                    className="chart-bottom"
                    style={{ paddingRight: `${rightMargin}px` }}
                >
<<<<<<< HEAD
                    <StatBox {...windowStats} label="Window" />
                    <StatBox
                        {...selectionStats}
                        label="Selection"
=======
                    <StatBox {...windowStats} label="WINDOW" />
                    <StatBox
                        {...selectionStats}
                        label="SELECTION"
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
                        action={
                            <Button
                                variant="secondary"
                                disabled={!chartCursorActive}
                                size="sm"
                                onClick={resetCursor}
                            >
                                CLEAR
                            </Button>
                        }
                    />
                </div>
            </div>
<<<<<<< HEAD
            {hasDigitalChannels && digitalChannelsVisible && (
=======
            {hasDigitalChannels && showDigitalChannels && (
>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
                <div className="chart-bits-container">
                    {bitsChartData.map((_, i) => (
                        <div key={`${i + 1}`} className="chart-bits">
                            <span>{bitsChartData[i].datasets[0].label}</span>
                            <div
                                className="chart-container"
                                style={{ paddingRight: `${rightMargin}px` }}
                            >
                                <Line
                                    data={bitsChartData[i]}
                                    options={bitsChartOptions}
                                    plugins={[crossHairPlugin]}
                                />
                            </div>
                        </div>
                    ))}
                    {numberOfBits === 0 && (
                        <div className="info">
                            <p>
                                Zoom in on the main chart to see the digital
                                channels
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

<<<<<<< HEAD
=======
Chart.propTypes = {
    digitalChannelsEnabled: bool,
};

>>>>>>> f987597... Move Chart back to common, reshuffled Trigger
export default Chart;
