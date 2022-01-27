/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint no-plusplus: off */
/* eslint operator-assignment: off */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import { bool } from 'prop-types';

import { options, timestampToIndex } from '../../globals';
import { useLazyInitializedRef } from '../../hooks/useLazyInitializedRef';
import {
    chartCursorAction,
    chartState,
    chartWindowAction,
} from '../../reducers/chartReducer';
import { dataLoggerState } from '../../reducers/dataLoggerReducer';
import AmpereChart from './AmpereChart';
import ChartTop from './ChartTop';
import dataAccumulatorInitialiser from './data/dataAccumulator';
import dataSelectorInitialiser from './data/dataSelector';
import DigitalChannels from './DigitalChannels';
import StatBox from './StatBox';
import TimeSpanBottom from './TimeSpan/TimeSpanBottom';
import TimeSpanTop from './TimeSpan/TimeSpanTop';

import chartCss from './chart.icss.scss';

const { rightMarginPx } = chartCss;

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

    const { data } = options;
    const indexBegin = Math.ceil(timestampToIndex(begin));
    const indexEnd = Math.floor(timestampToIndex(end));

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

    const { bits, data } = options;

    const chartRef = useRef(null);

    const dataAccumulator = useLazyInitializedRef(
        dataAccumulatorInitialiser
    ).current;
    const dataSelector = useLazyInitializedRef(dataSelectorInitialiser).current;

    const { sampleFreq } = useSelector(dataLoggerState);

    const digitalChannelsWindowLimit = 3e12 / sampleFreq;
    const zoomedOutTooFarForDigitalChannels =
        windowDuration > digitalChannelsWindowLimit;

    const digitalChannelsToDisplay = digitalChannels
        .map((isVisible, channelNumber) => (isVisible ? channelNumber : null))
        .filter(channelNumber => channelNumber != null);

    const digitalChannelsToCompute =
        !zoomedOutTooFarForDigitalChannels && showDigitalChannels && bits
            ? digitalChannelsToDisplay
            : [];

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
    const selectionStats = useMemo(
        () => calcStats(cursorBegin, cursorEnd),
        [cursorBegin, cursorEnd]
    );

    const resetCursor = useCallback(
        () => chartCursor(null, null),
        [chartCursor]
    );

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

    /** Center the graph inside the window
     * @param {number} localWindowDuration
     */
    const zoomToWindow = useCallback(
        localWindowDuration => {
            if (windowEnd) {
                const center = (windowBegin + windowEnd) / 2;
                let localWindowBegin = center - localWindowDuration / 2;
                let localWindowEnd = center + localWindowDuration / 2;
                if (localWindowEnd > windowEnd) {
                    localWindowBegin =
                        localWindowBegin - (localWindowEnd - windowEnd);
                    localWindowEnd = windowEnd;
                }
                chartWindow(localWindowBegin, localWindowEnd);
                return;
            }
            chartReset(localWindowDuration);
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

    const originalIndexBegin = timestampToIndex(begin);
    const originalIndexEnd = timestampToIndex(end);
    const step = len === 0 ? 2 : (originalIndexEnd - originalIndexBegin) / len;
    const { ampereLineData, bitsLineData } = useMemo(() => {
        const dataProcessor = step > 1 ? dataAccumulator : dataSelector;

        return dataProcessor.process(
            begin,
            end,
            digitalChannelsToCompute,
            len,
            windowDuration
        );
    }, [
        begin,
        dataAccumulator,
        dataSelector,
        end,
        len,
        digitalChannelsToCompute,
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
                <AmpereChart
                    setLen={setLen}
                    setChartAreaWidth={setChartAreaWidth}
                    step={step}
                    chartRef={chartRef}
                    cursorData={cursorData}
                    lineData={ampereLineData}
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
                    lineData={bitsLineData}
                    digitalChannels={digitalChannels}
                    zoomedOutTooFar={zoomedOutTooFarForDigitalChannels}
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
