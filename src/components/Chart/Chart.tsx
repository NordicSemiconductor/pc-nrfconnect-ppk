/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import { useHotKey } from '@nordicsemiconductor/pc-nrfconnect-shared';
import {
    Chart as ChartJS,
    LinearScale,
    LineElement,
    LogarithmicScale,
    PointElement,
    Title,
} from 'chart.js';

import Minimap from '../../features/minimap/Minimap';
import {
    DataManager,
    getSamplesPerSecond,
    timestampToIndex,
} from '../../globals';
import {
    isInitialised,
    useLazyInitializedRef,
} from '../../hooks/useLazyInitializedRef';
import { RootState } from '../../slices';
import {
    chartCursorAction,
    chartWindowAction,
    getChartDigitalChanelInfo,
    getChartXAxisRange,
    getChartYAxisRange,
    getCursorRange,
    isLiveMode,
    MAX_WINDOW_DURATION,
    setLiveMode,
} from '../../slices/chartSlice';
import { dataLoggerState } from '../../slices/dataLoggerSlice';
import { TDispatch } from '../../slices/thunk';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';
import type { AmpereChartJS } from './AmpereChart';
import AmpereChart from './AmpereChart';
import ChartTop from './ChartTop';
import dataAccumulatorInitialiser, { calcStats } from './data/dataAccumulator';
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

export type CursorData = {
    cursorBegin: number | null | undefined;
    cursorEnd: number | null | undefined;
    begin: number;
    end: number;
};

const { rightMarginPx } = chartCss;

const rightMargin = parseInt(rightMarginPx, 10);

const Chart = ({ digitalChannelsEnabled = false }) => {
    const dispatch = useDispatch();
    const liveMode = useSelector(isLiveMode);

    const chartWindow = useCallback(
        (
            windowBegin: number,
            windowEnd: number,
            yMin?: number | null,
            yMax?: number | null
        ) =>
            dispatch(
                chartWindowAction(
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
                    DataManager().getTimestamp() - windowDuration,
                    windowDuration
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
            if (DataManager().getTimestamp() > 0) {
                return chartCursor(0, DataManager().getTimestamp());
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
                const { cursorBegin, cursorEnd } = getCursorRange(getState());
                if (cursorBegin != null && cursorEnd != null) {
                    chartWindow(cursorBegin, cursorEnd);
                }
            });
        },
    });

    const { digitalChannels, digitalChannelsVisible, hasDigitalChannels } =
        useSelector(getChartDigitalChanelInfo);

    const { yAxisLog } = useSelector(getChartYAxisRange);

    const { cursorBegin, cursorEnd } = useSelector(getCursorRange);

    const {
        windowBeginLock,
        windowEndLock,
        xAxisMax,
        windowDuration,
        windowBegin,
        windowEnd,
    } = useSelector(getChartXAxisRange);

    const isDataLoggerPane = useSelector(isDataLoggerPaneSelector);
    const showDigitalChannels =
        digitalChannelsVisible && digitalChannelsEnabled;

    const bits = DataManager().getData(windowBegin, windowEnd).bits; // TO Check this

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

    const end = windowEnd;
    const begin = Math.max(0, end - windowDuration);

    const cursorData: CursorData = {
        cursorBegin,
        cursorEnd,
        begin,
        end,
    };

    const [windowNumberOfPixels, setWindowsNumberOfPixels] = useState(0);
    const [chartAreaWidth, setChartAreaWidth] = useState(0);

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
            if (!isDataLoggerPane) return;

            if (beginX === undefined || endX === undefined) {
                chartReset(windowDuration);
                return;
            }

            const earliestDataTime = 0;
            const samplesPerSecond = getSamplesPerSecond();
            const maxWindowWidth = MAX_WINDOW_DURATION / samplesPerSecond;

            const minLimit = windowBeginLock || earliestDataTime;
            const maxLimit =
                windowEndLock ||
                Math.max(DataManager().getTimestamp(), maxWindowWidth);

            const newBeginX = Math.max(beginX, minLimit);
            const newEndX = Math.min(endX, maxLimit);

            if (windowDuration === newEndX - newBeginX) {
                dispatch(setLiveMode(false));
            }

            chartWindow(newBeginX, newEndX, beginY, endY);
        },
        [
            isDataLoggerPane,
            windowBeginLock,
            windowEndLock,
            windowDuration,
            chartWindow,
            chartReset,
            dispatch,
        ]
    );

    /** Center the graph inside the window
     * @param {number} localWindowDuration
     */
    const zoomToWindow = useCallback(
        localWindowDuration => {
            if (liveMode) {
                chartReset(localWindowDuration);
                return;
            }

            const center = (windowBegin + windowEnd) / 2;
            let localWindowBegin = center - localWindowDuration / 2;
            let localWindowEnd = center + localWindowDuration / 2;
            if (localWindowEnd > windowEnd) {
                localWindowBegin -= localWindowEnd - windowEnd;
                localWindowEnd = windowEnd;
            }
            chartWindow(localWindowBegin, localWindowEnd);
        },
        [liveMode, windowBegin, windowEnd, chartWindow, chartReset]
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

    const samplesInWindowView = timestampToIndex(windowDuration);
    const samplesPixel =
        windowNumberOfPixels === 0
            ? 2
            : samplesInWindowView / windowNumberOfPixels;
    const dataProcessor = samplesPixel > 1 ? dataAccumulator : dataSelector;

    const [ampereLineData, setAmpereLineData] = useState<AmpereState[]>([]);
    const [bitsLineData, setBitsLineData] = useState<DigitalChannelStates[]>(
        []
    );

    const windowStats = useMemo(() => calcStats(begin, end), [begin, end]);
    const selectionStats = useMemo(
        () => calcStats(cursorBegin, cursorEnd),
        [cursorBegin, cursorEnd]
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
                windowNumberOfPixels,
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
        windowNumberOfPixels,
        windowDuration,
        dataProcessor,
        digitalChannelsToCompute,
        yAxisLog,
        xAxisMax,
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
                    disabled={DataManager().getTotalSavedRecords() <= 0}
                    size="sm"
                    onClick={() => chartCursor(0, DataManager().getTimestamp())}
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
                    onLiveModeChange={isLive => {
                        dispatch(setLiveMode(isLive));
                    }}
                    live={liveMode}
                    zoomToWindow={zoomToWindow}
                    chartRef={chartRef}
                    windowDuration={windowDuration}
                />
                <TimeSpanTop width={chartAreaWidth + 1} />
                <AmpereChart
                    setWindowsNumberOfPixels={setWindowsNumberOfPixels}
                    setChartAreaWidth={setChartAreaWidth}
                    samplesPixel={samplesPixel}
                    chartRef={chartRef}
                    cursorData={cursorData}
                    lineData={ampereLineData}
                />
                <TimeSpanBottom
                    cursorBegin={cursorBegin}
                    cursorEnd={cursorEnd}
                    width={chartAreaWidth + 1}
                />
                {isDataLoggerPane ? <Minimap /> : null}
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
