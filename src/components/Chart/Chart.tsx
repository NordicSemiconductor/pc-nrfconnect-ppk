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
import {
    Chart as ChartJS,
    LinearScale,
    LineElement,
    LogarithmicScale,
    PointElement,
    Title,
} from 'chart.js';
import { useHotKey } from 'pc-nrfconnect-shared';

import Minimap from '../../features/minimap/Minimap';
import {
    getSamplesPerSecond,
    indexToTimestamp,
    options,
    timestampToIndex,
} from '../../globals';
import {
    isInitialised,
    useLazyInitializedRef,
} from '../../hooks/useLazyInitializedRef';
import { RootState } from '../../slices';
import {
    chartCursorAction,
    chartState,
    chartWindowAction,
    MAX_WINDOW_DURATION,
} from '../../slices/chartSlice';
import { dataLoggerState } from '../../slices/dataLoggerSlice';
import { TDispatch } from '../../slices/thunk';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';
import type { AmpereChartJS } from './AmpereChart';
import AmpereChart from './AmpereChart';
import ChartTop from './ChartTop';
import dataAccumulatorInitialiser from './data/dataAccumulator';
import dataSelectorInitialiser from './data/dataSelector';
import { AmpereState, DigitalChannelStates } from './data/dataTypes';
import DigitalChannels from './DigitalChannels';
import StatBox from './StatBox';
import TimeSpanBottom from './TimeSpan/TimeSpanBottom';
import TimeSpanTop from './TimeSpan/TimeSpanTop';

import chartCss from './chart.icss.scss';

// chart.js way of doing tree-shaking, meaning that components that will be included in the bundle
// must be imported and registered. The registered components are used in both AmpChart and DigitalChannels.
ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    LogarithmicScale,
    Title
);

const { rightMarginPx } = chartCss;

const rightMargin = parseInt(rightMarginPx, 10);

const calcStats = (_begin?: null | number, _end?: null | number) => {
    if (_begin == null || _end == null) {
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
        (
            windowBegin: number,
            windowEnd: number,
            yMin?: number | null,
            yMax?: number | null
        ) =>
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
            dispatch(chartCursorAction({ cursorBegin, cursorEnd })),
        [dispatch]
    );

    useHotKey({
        hotKey: 'alt+a',
        title: 'Select all',
        isGlobal: false,
        action: () => {
            if (options.index > 0) {
                return chartCursor(0, indexToTimestamp(options.index));
            }
            return false;
        },
    });

    useHotKey({
        hotKey: 'esc',
        title: 'Select none',
        isGlobal: false,
        action: () => {
            resetCursor();
        },
    });

    useHotKey({
        hotKey: 'alt+z',
        title: 'Zoom to selected area',
        isGlobal: false,
        action: () => {
            dispatch((_dispatch: TDispatch, getState: () => RootState) => {
                const { cursorBegin, cursorEnd } = chartState(getState());
                if (cursorBegin != null && cursorEnd != null) {
                    chartWindow(cursorBegin, cursorEnd);
                }
            });
        },
    });

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
        yAxisLog,
    } = useSelector(chartState);
    const isDataLoggerPane = useSelector(isDataLoggerPaneSelector);
    const showDigitalChannels =
        digitalChannelsVisible && digitalChannelsEnabled;

    const { bits, data } = options;

    const chartRef = useRef<AmpereChartJS | null>(null);

    const dataAccumulator = useLazyInitializedRef(
        dataAccumulatorInitialiser
    ).current;
    const dataSelector = useLazyInitializedRef(dataSelectorInitialiser).current;

    const { sampleFreq } = useSelector(dataLoggerState);

    const digitalChannelsWindowLimit = 3e12 / sampleFreq;
    const zoomedOutTooFarForDigitalChannels =
        windowDuration > digitalChannelsWindowLimit;

    const digitalChannelsToDisplay = useMemo(
        () =>
            digitalChannels
                .map((isVisible, channelNumber) =>
                    isVisible ? channelNumber : null
                )
                .filter(channelNumber => channelNumber != null),
        [digitalChannels]
    );

    const digitalChannelsToCompute = useMemo(
        () =>
            !zoomedOutTooFarForDigitalChannels && showDigitalChannels && bits
                ? digitalChannelsToDisplay
                : [],
        [
            bits,
            zoomedOutTooFarForDigitalChannels,
            showDigitalChannels,
            digitalChannelsToDisplay,
        ]
    );

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
        (
            beginX?: number,
            endX?: number,
            beginY?: number | null,
            endY?: number | null
        ) => {
            if (beginX === undefined || endX === undefined) {
                chartReset(windowDuration);
                return;
            }

            const earliestDataTime = 0;
            const samplesPerSecond = getSamplesPerSecond();
            const maxWindowWidth = MAX_WINDOW_DURATION / samplesPerSecond;

            const minLimit = windowBeginLock || earliestDataTime;
            const maxLimit =
                windowEndLock || Math.max(options.timestamp, maxWindowWidth);

            const newBeginX = Math.max(beginX, minLimit);
            const newEndX = Math.min(endX, maxLimit);

            chartWindow(newBeginX, newEndX, beginY, endY);
        },
        [
            windowBeginLock,
            windowEndLock,
            chartReset,
            windowDuration,
            chartWindow,
        ]
    );

    /** Center the graph inside the window
     * @param {number} localWindowDuration
     */
    const zoomToWindow = useCallback(
        localWindowDuration => {
            if (windowBegin != null && windowEnd != null) {
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
        if (!chartRef.current) {
            return;
        }
        if (chartRef.current.dragSelect) {
            chartRef.current.dragSelect.callback = chartCursor;
        }
        if (chartRef.current.zoomPan) {
            chartRef.current.zoomPan.zoomPanCallback = zoomPanCallback;
        }
    }, [chartCursor, zoomPanCallback]);

    const chartPause = () =>
        chartWindow(options.timestamp - windowDuration, options.timestamp);

    const originalIndexBegin = timestampToIndex(begin);
    const originalIndexEnd = timestampToIndex(end);
    const step = len === 0 ? 2 : (originalIndexEnd - originalIndexBegin) / len;
    const dataProcessor = step > 1 ? dataAccumulator : dataSelector;

    const [ampereLineData, setAmpereLineData] = useState<AmpereState[]>([]);
    const [bitsLineData, setBitsLineData] = useState<DigitalChannelStates[]>(
        []
    );

    useEffect(() => {
        if (!isInitialised(dataProcessor)) {
            return;
        }
        const calculation = setTimeout(() => {
            const processedData = dataProcessor.process(
                begin,
                end,
                digitalChannelsToCompute as number[],
                yAxisLog,
                len,
                windowDuration
            );

            setAmpereLineData(processedData.ampereLineData);
            setBitsLineData(processedData.bitsLineData);
        });

        return () => {
            clearTimeout(calculation);
        };
    }, [
        begin,
        end,
        len,
        windowDuration,
        dataProcessor,
        digitalChannelsToCompute,
        yAxisLog,
    ]);

    const chartCursorActive = cursorBegin !== null || cursorEnd !== null;

    const selectionButtons = () => {
        const buttons = [
            <Button
                key="clear-selection-btn"
                variant="secondary"
                disabled={!chartCursorActive}
                size="sm"
                onClick={resetCursor}
            >
                CLEAR
            </Button>,
        ];

        if (isDataLoggerPane) {
            buttons.push(
                <Button
                    key="select-all-btn"
                    variant="secondary"
                    disabled={options.index <= 0}
                    size="sm"
                    onClick={() =>
                        chartCursor(0, indexToTimestamp(options.index))
                    }
                >
                    SELECT ALL
                </Button>
            );
            buttons.push(
                <Button
                    key="zoom-to-selection-btn"
                    variant="secondary"
                    size="sm"
                    disabled={cursorBegin == null || cursorEnd == null}
                    onClick={() => {
                        if (cursorBegin != null && cursorEnd != null) {
                            chartWindow(cursorBegin, cursorEnd);
                        }
                    }}
                >
                    ZOOM TO SELECTION
                </Button>
            );
        }

        return buttons;
    };

    return (
        <div className="chart-outer">
            <div className="chart-current">
                <ChartTop
                    chartPause={chartPause}
                    zoomToWindow={zoomToWindow}
                    chartRef={chartRef}
                    windowDuration={windowDuration}
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
                <Minimap />
                <div
                    className="chart-bottom"
                    style={{ paddingRight: `${rightMargin}px` }}
                >
                    <StatBox {...windowStats} label="Window" />
                    <StatBox
                        {...selectionStats}
                        label="Selection"
                        actionButtons={selectionButtons()}
                    />
                </div>
            </div>
            {hasDigitalChannels && showDigitalChannels && (
                <DigitalChannels
                    lineData={bitsLineData}
                    digitalChannels={digitalChannels}
                    zoomedOutTooFar={zoomedOutTooFarForDigitalChannels}
                    /* ts-expect-error -- temporary */
                    cursorData={cursorData}
                />
            )}
        </div>
    );
};

export default Chart;
