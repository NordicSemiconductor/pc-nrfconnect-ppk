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
import { useDispatch, useSelector } from 'react-redux';
import {
    AppDispatch,
    AppThunk,
    useHotKey,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
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
    indexToTimestamp,
    timestampToIndex,
} from '../../globals';
import {
    DataAccumulatorInstance,
    isInitialised,
    useLazyInitializedRef,
} from '../../hooks/useLazyInitializedRef';
import { RootState } from '../../slices';
import { isSamplingRunning } from '../../slices/appSlice';
import {
    chartCursorAction,
    chartWindowAction,
    getChartDigitalChannelInfo,
    getChartXAxisRange,
    getCursorRange,
    getForceRerender,
    getRecordingMode,
    isLiveMode,
    MAX_WINDOW_DURATION,
    setFPS,
    setLiveMode,
} from '../../slices/chartSlice';
import { getProgress } from '../../slices/triggerSlice';
import { isDataLoggerPane } from '../../utils/panes';
import { type booleanTupleOf8 } from '../../utils/persistentStore';
import type { AmpereChartJS } from './AmpereChart';
import AmpereChart from './AmpereChart';
import ChartTop from './ChartTop';
import dataAccumulatorInitialiser, { calcStats } from './data/dataAccumulator';
import { AmpereState, DigitalChannelStates } from './data/dataTypes';
import DigitalChannels from './DigitalChannels';
import StatBox from './StatBox';
import TimeSpanBottom from './TimeSpan/TimeSpanBottom';
import TimeSpanTop from './TimeSpan/TimeSpanTop';

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

let nextUpdateRequests: (() => Promise<void>) | undefined;
let chartUpdateInprogress = false;

const executeChartUpdateOperation = async () => {
    if (!nextUpdateRequests || chartUpdateInprogress) return;

    const nextTask = nextUpdateRequests;
    nextUpdateRequests = undefined;

    chartUpdateInprogress = true;
    try {
        await nextTask();
    } catch {
        // do nothing
    }

    chartUpdateInprogress = false;
    executeChartUpdateOperation();
};

const updateChart = async (
    dataProcessor: DataAccumulatorInstance,
    numberOfPixelsInWindow: number,
    digitalChannels: booleanTupleOf8,
    digitalChannelsVisible: boolean,
    windowBegin: number,
    windowDuration: number,
    windowEnd: number,
    setData: (data: {
        ampereLineData: AmpereState[];
        bitsLineData: DigitalChannelStates[];
    }) => void,
    setProcessing: (processing: boolean) => void,
    setWindowStats: (
        state: {
            average: number;
            max: number;
            delta: number;
        } | null
    ) => void
) => {
    if (
        !isInitialised(dataProcessor) ||
        DataManager().getTotalSavedRecords() === 0
    ) {
        return;
    }

    const sampleFreq = getSamplesPerSecond();

    const digitalChannelsWindowLimit = 3e12 / sampleFreq;
    const zoomedOutTooFarForDigitalChannels =
        windowDuration > digitalChannelsWindowLimit;

    const digitalChannelsToDisplay = digitalChannels
        .map((isVisible, channelNumber) => (isVisible ? channelNumber : null))
        .filter(channelNumber => channelNumber != null) as number[];

    const digitalChannelsToCompute =
        !zoomedOutTooFarForDigitalChannels && digitalChannelsVisible
            ? digitalChannelsToDisplay
            : [];

    const processedData = await dataProcessor.process(
        windowBegin,
        windowEnd,
        zoomedOutTooFarForDigitalChannels
            ? []
            : (digitalChannelsToCompute as number[]),
        Math.min(indexToTimestamp(windowDuration), numberOfPixelsInWindow),
        windowDuration,
        setProcessing
    );

    const avgTemp = processedData.averageLine.reduce(
        (previousValue, currentValue) => ({
            sum: previousValue.sum + currentValue.y,
            count: previousValue.count + currentValue.count,
        }),
        {
            sum: 0,
            count: 0,
        }
    );
    const average = avgTemp.sum / avgTemp.count / 1000;

    const filteredAmpereLine = processedData.ampereLineData.filter(
        v => v.y != null && !Number.isNaN(v.y)
    );
    let max = filteredAmpereLine.length > 0 ? -Number.MAX_VALUE : 0;

    filteredAmpereLine.forEach(v => {
        if (v.y != null && v.y > max) {
            max = v.y;
        }
    });

    max /= 1000;

    setData({
        ampereLineData: processedData.ampereLineData,
        bitsLineData: processedData.bitsLineData,
    });

    setWindowStats({
        max,
        average,
        delta:
            DataManager().getTotalSavedRecords() > 0
                ? Math.min(windowEnd, DataManager().getTimestamp()) -
                  windowBegin +
                  indexToTimestamp(1)
                : 0,
    });
};
const Chart = () => {
    const dispatch = useDispatch<AppDispatch>();
    const recordingMode = useSelector(getRecordingMode);
    const liveMode = useSelector(isLiveMode) && recordingMode === 'DataLogger';
    const rerenderTrigger = useSelector(getForceRerender);
    const samplingRunning = useSelector(isSamplingRunning);
    const triggerProgress = useSelector(getProgress);
    const dataLoggerPane = useSelector(isDataLoggerPane);

    const waitingForTrigger =
        samplingRunning &&
        recordingMode === 'Scope' &&
        (DataManager().getTimestamp() === 0 ||
            !!triggerProgress.progressMessage);

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
            const zoomToSelectedArea =
                (): AppThunk<RootState> => (_dispatch, getState) => {
                    const { cursorBegin, cursorEnd } = getCursorRange(
                        getState()
                    );
                    if (cursorBegin != null && cursorEnd != null) {
                        chartWindow(cursorBegin, cursorEnd);
                    }
                };

            dispatch(zoomToSelectedArea());
        },
    });

    const { digitalChannels, digitalChannelsVisible } = useSelector(
        getChartDigitalChannelInfo
    );

    const { cursorBegin, cursorEnd } = useSelector(getCursorRange);

    const {
        windowBeginLock,
        windowEndLock,
        xAxisMax,
        windowDuration,
        windowBegin,
        windowEnd,
    } = useSelector(getChartXAxisRange);

    const chartRef = useRef<AmpereChartJS | null>(null);

    const dataProcessor = useLazyInitializedRef(
        dataAccumulatorInitialiser
    ).current;

    const sampleFreq = useSelector(getSamplesPerSecond);

    const digitalChannelsWindowLimit = 3e12 / sampleFreq;
    const zoomedOutTooFarForDigitalChannels =
        windowDuration > digitalChannelsWindowLimit;

    const cursorData: CursorData = useMemo(
        () => ({
            cursorBegin,
            cursorEnd,
            begin: windowBegin,
            end: windowEnd,
        }),
        [cursorBegin, cursorEnd, windowBegin, windowEnd]
    );

    const [numberOfPixelsInWindow, setNumberOfPixelsInWindow] = useState(0);
    const [chartAreaWidth, setChartAreaWidth] = useState(0);

    const resetCursor = useCallback(() => {
        selectionStateAbortController.current?.abort();
        chartCursor(null, null);
    }, [chartCursor]);

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
                windowEndLock ||
                Math.max(DataManager().getTimestamp(), maxWindowWidth);

            const newBeginX = Math.max(beginX, minLimit);
            const newEndX = Math.min(endX, maxLimit);

            dispatch(setLiveMode(false));

            chartWindow(newBeginX, newEndX, beginY, endY);
        },
        [
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

    const samplesPerPixel = useMemo(() => {
        const samplesInWindowView = timestampToIndex(windowDuration);
        return numberOfPixelsInWindow === 0
            ? 2
            : samplesInWindowView / numberOfPixelsInWindow;
    }, [numberOfPixelsInWindow, windowDuration]);

    const [data, setData] = useState<{
        ampereLineData: AmpereState[];
        bitsLineData: DigitalChannelStates[];
    }>({ ampereLineData: [], bitsLineData: [] });

    const [windowStats, setWindowStats] = useState<{
        average: number;
        max: number;
        delta: number;
    } | null>(null);

    const [selectionStats, setSelectionStats] = useState<{
        average: number;
        max: number;
        delta: number;
    } | null>(null);

    const [selectionStatsProcessing, setSelectionStatsProcessing] =
        useState(false);
    const [
        selectionStatsProcessingProgress,
        setSelectionStatsProcessingProgress,
    ] = useState(0);
    const selectionStateAbortController = useRef<AbortController>();

    useEffect(() => {
        if (cursorBegin != null && cursorEnd != null) {
            setSelectionStatsProcessing(true);
            selectionStateAbortController.current?.abort();
            selectionStateAbortController.current = new AbortController();
            setSelectionStatsProcessingProgress(0);
            selectionStateAbortController.current.signal.addEventListener(
                'abort',
                () => setSelectionStatsProcessing(false)
            );
            calcStats(
                (average, max, delta) => {
                    setSelectionStats({ average, max, delta });
                    setSelectionStatsProcessing(false);
                },
                cursorBegin,
                cursorEnd,
                selectionStateAbortController.current,
                setSelectionStatsProcessingProgress
            );
        } else {
            setSelectionStats(null);
        }
    }, [cursorBegin, cursorEnd, rerenderTrigger]);

    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (xAxisMax === 0) {
            setData({ ampereLineData: [], bitsLineData: [] });
            setWindowStats(null);
        }
    }, [xAxisMax]);

    const lastLiveRenderTime = useRef<number>(0);
    const lastFPSUpdate = useRef<number>(performance.now());
    const fpsCounter = useRef<number>(0);

    useEffect(() => {
        const now = performance.now();
        const forceRender = now - lastLiveRenderTime.current > 1000; // force 1 FPS
        if (liveMode) {
            if (!DataManager().isInSync() && !forceRender) {
                return;
            }

            lastLiveRenderTime.current = now;

            nextUpdateRequests = () => {
                fpsCounter.current += 1;
                return updateChart(
                    dataProcessor,
                    numberOfPixelsInWindow,
                    digitalChannels,
                    digitalChannelsVisible,
                    windowBegin,
                    windowDuration,
                    windowEnd,
                    setData,
                    setProcessing,
                    setWindowStats
                );
            };
            executeChartUpdateOperation();

            const updateFPSValue = now - lastFPSUpdate.current > 1000;

            if (updateFPSValue) {
                dispatch(setFPS(fpsCounter.current));
                fpsCounter.current = 0;
                lastFPSUpdate.current = now;
            }
        }
    }, [
        xAxisMax,
        liveMode,
        windowBegin,
        windowEnd,
        rerenderTrigger,
        dispatch,
        dataProcessor,
        numberOfPixelsInWindow,
        digitalChannels,
        digitalChannelsVisible,
        windowDuration,
    ]);

    const lastPositions = useRef({
        windowBegin,
        windowEnd,
    });

    useEffect(() => {
        if (!liveMode && DataManager().getTotalSavedRecords() > 0) {
            nextUpdateRequests = () =>
                updateChart(
                    dataProcessor,
                    numberOfPixelsInWindow,
                    digitalChannels,
                    digitalChannelsVisible,
                    windowBegin,
                    windowDuration,
                    windowEnd,
                    setData,
                    setProcessing,
                    setWindowStats
                );
            executeChartUpdateOperation();

            lastPositions.current.windowBegin = windowBegin;
            lastPositions.current.windowEnd = windowEnd;
        }
    }, [
        windowBegin,
        liveMode,
        windowEnd,
        rerenderTrigger,
        dispatch,
        dataProcessor,
        numberOfPixelsInWindow,
        digitalChannels,
        digitalChannelsVisible,
        windowDuration,
    ]);

    const chartCursorActive = useMemo(
        () => cursorBegin !== null || cursorEnd !== null,
        [cursorBegin, cursorEnd]
    );

    const selectionButtons = useMemo(
        () => [
            <button
                type="button"
                className="tw-float-right tw-border tw-border-gray-200 tw-bg-white tw-px-0.5 tw-text-[10px] tw-leading-3 active:enabled:tw-bg-gray-50"
                key="clear-selection-btn"
                disabled={!chartCursorActive}
                onClick={resetCursor}
            >
                CLEAR
            </button>,
            <button
                type="button"
                className="tw-float-right tw-border tw-border-gray-200 tw-bg-white tw-px-0.5 tw-text-[10px] tw-leading-3 active:enabled:tw-bg-gray-50"
                key="select-all-btn"
                disabled={
                    DataManager().getTotalSavedRecords() <= 0 ||
                    selectionStatsProcessing
                }
                onClick={() => chartCursor(0, DataManager().getTimestamp())}
            >
                SELECT ALL
            </button>,
            <button
                type="button"
                className="tw-float-right tw-border tw-border-gray-200 tw-bg-white tw-px-0.5 tw-text-[10px] tw-leading-3 active:enabled:tw-bg-gray-50"
                key="zoom-to-selection-btn"
                disabled={
                    cursorBegin == null ||
                    cursorEnd == null ||
                    selectionStatsProcessing
                }
                onClick={() => {
                    if (cursorBegin != null && cursorEnd != null) {
                        dispatch(setLiveMode(false));
                        chartWindow(cursorBegin, cursorEnd);
                    }
                }}
            >
                ZOOM TO SELECTION
            </button>,
        ],
        [
            chartCursor,
            chartCursorActive,
            chartWindow,
            cursorBegin,
            cursorEnd,
            dispatch,
            resetCursor,
            selectionStatsProcessing,
        ]
    );

    return (
        <div className="tw-relative tw-flex tw-h-full tw-w-full tw-flex-col tw-justify-between tw-gap-4 tw-text-gray-600">
            <div className="scroll-bar-white-bg tw-flex tw-h-full tw-flex-col tw-overflow-y-auto tw-overflow-x-hidden tw-bg-white tw-p-2">
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
                    processing={processing || waitingForTrigger}
                    processingMessage={
                        waitingForTrigger
                            ? triggerProgress.progressMessage ??
                              'Waiting for trigger'
                            : undefined
                    }
                    processingPercent={triggerProgress.progress}
                    setNumberOfPixelsInWindow={setNumberOfPixelsInWindow}
                    setChartAreaWidth={setChartAreaWidth}
                    numberOfSamplesPerPixel={samplesPerPixel}
                    chartRef={chartRef}
                    cursorData={cursorData}
                    lineData={data.ampereLineData}
                />
                <TimeSpanBottom
                    cursorBegin={cursorBegin}
                    cursorEnd={cursorEnd}
                    width={chartAreaWidth + 1}
                />

                <div className="tw-flex tw-flex-col tw-gap-4 tw-py-4 tw-pl-16 tw-pr-8">
                    {dataLoggerPane && (
                        <div>
                            <Minimap />
                        </div>
                    )}
                    <div className="tw-flex tw-flex-grow tw-flex-wrap tw-gap-2">
                        <StatBox
                            average={
                                windowStats?.average ? windowStats.average : 0
                            }
                            max={windowStats?.max ? windowStats.max : 0}
                            delta={windowStats?.delta ? windowStats.delta : 0}
                            label="Window"
                        />
                        <StatBox
                            progress={selectionStatsProcessingProgress}
                            processing={selectionStatsProcessing}
                            {...selectionStats}
                            label="Selection"
                            actionButtons={selectionButtons}
                        />
                    </div>
                </div>
            </div>
            {digitalChannelsVisible && (
                <DigitalChannels
                    lineData={data.bitsLineData}
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
