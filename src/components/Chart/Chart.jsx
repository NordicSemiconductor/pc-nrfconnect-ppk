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

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { bool } from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';

import ChartTop from './ChartTop';
import StatBox from './StatBox';
import TimeSpanTop from './TimeSpan/TimeSpanTop';
import TimeSpanBottom from './TimeSpan/TimeSpanBottom';
import DigitalChannels from './DigitalChannels';
import ChartContainer from './ChartContainer';

import {
    chartWindowAction,
    chartCursorAction,
    chartState,
} from '../../reducers/chartReducer';

import { options, timestampToIndex, nbDigitalChannels } from '../../globals';

import { rightMarginPx } from './chart.scss';
import { useLazyInitializedRef } from '../../hooks/useLazyInitializedRef';

import dataAccumulatorInitialiser from './data/dataAccumulator';
import dataSelectorInitialiser from './data/dataSelector';
import { dataLoggerState } from '../../reducers/dataLoggerReducer';

const rightMargin = parseInt(rightMarginPx, 10);

const calcStats = (_begin, _end) => {
    if (_begin === null || _end === null) {
        return null;
    }
    let begin = _begin;
    let end = _end;
    if (end < begin) {
        [begin, end] = [end, begin];
    }

    const { data, index } = options;
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

const Chart = ({ digitalChannelsEnabled = false }) => {
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
        windowBeginLock,
        windowEndLock,
        cursorBegin,
        cursorEnd,
        digitalChannels,
        digitalChannelsVisible,
        hasDigitalChannels,
    } = useSelector(chartState);
    const showDigitalChannels =
        digitalChannelsVisible && digitalChannelsEnabled;

    const { bits, data, index } = options;

    const chartRef = useRef(null);

    const dataAccumulator = useLazyInitializedRef(dataAccumulatorInitialiser)
        .current;
    const dataSelector = useLazyInitializedRef(dataSelectorInitialiser).current;

    const { sampleFreq } = useSelector(dataLoggerState);
    const digitalChannelsWindowLimit = 3e11 / sampleFreq;

    let numberOfBits =
        windowDuration <= digitalChannelsWindowLimit && showDigitalChannels
            ? nbDigitalChannels
            : 0;
    if (!bits) {
        numberOfBits = 0;
    }

    const end = windowEnd || options.timestamp - options.samplingTime;
    const begin = windowBegin || end - windowDuration;

    const cursorData = {
        cursorBegin,
        cursorEnd,
        begin,
        end,
    };

    const [len, setLen] = useState(0);
    const [chartAreaWidth, setChartAreaWidth] = useState(0);

    const windowStats = useMemo(() => calcStats(begin, end), [begin, end]);
    const selectionStats = useMemo(() => calcStats(cursorBegin, cursorEnd), [
        cursorBegin,
        cursorEnd,
    ]);

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

            const minLimit = windowBeginLock || earliestDataTime;
            const maxLimit = windowEndLock || options.timestamp;
            const p0 = Math.max(0, minLimit - beginX);
            const p1 = Math.max(0, endX - maxLimit);

            if (p0 * p1 === 0) {
                chartWindow(beginX - p1 + p0, endX - p1 + p0, beginY, endY);
            }
        },
        [
            data.length,
            windowBeginLock,
            windowEndLock,
            chartReset,
            windowDuration,
            resetCursor,
            chartWindow,
        ]
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

    const [lineData, bitsData] = useMemo(() => {
        const dataProcessor = step > 1 ? dataAccumulator : dataSelector;

        return dataProcessor.process(
            begin,
            end,
            numberOfBits,
            len,
            windowDuration
        );
    }, [
        begin,
        dataAccumulator,
        dataSelector,
        end,
        len,
        numberOfBits,
        step,
        windowDuration,
    ]);

    const chartCursorActive = cursorBegin !== null || cursorEnd !== null;

    return (
        <div className="chart-outer">
            <div className="chart-current">
                <ChartTop
                    chartPause={chartPause}
                    chartResetToLive={chartResetToLive}
                    zoomToWindow={zoomToWindow}
                    chartRef={chartRef}
                />
                <TimeSpanTop width={chartAreaWidth + 1} />
                <ChartContainer
                    setLen={setLen}
                    setChartAreaWidth={setChartAreaWidth}
                    step={step}
                    chartRef={chartRef}
                    cursorData={cursorData}
                    lineData={lineData}
                />
                <TimeSpanBottom
                    cursorBegin={cursorBegin}
                    cursorEnd={cursorEnd}
                    width={chartAreaWidth + 1}
                />
                <div
                    className="chart-bottom"
                    style={{ paddingRight: `${rightMargin}px` }}
                >
                    <StatBox {...windowStats} label="Window" />
                    <StatBox
                        {...selectionStats}
                        label="Selection"
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
            {hasDigitalChannels && showDigitalChannels && (
                <DigitalChannels
                    bitsData={bitsData}
                    digitalChannels={digitalChannels}
                    numberOfBits={numberOfBits}
                    cursorData={cursorData}
                />
            )}
        </div>
    );
};

Chart.propTypes = {
    digitalChannelsEnabled: bool,
};

export default Chart;
