/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { Chart, ChartOptions } from 'chart.js';

import minimapScroll from '../../components/Chart/plugins/minimap.scroll';
import { DataManager, indexToTimestamp } from '../../globals';
import {
    getChartXAxisRange,
    getChartYAxisRange,
    isLiveMode,
    isSessionActive,
    panWindow,
} from '../../slices/chartSlice';
import { getXAxisMaxTime, showMinimap as getShowMinimap } from './minimapSlice';

export interface MinimapOptions extends ChartOptions<'line'> {
    ampereChart?: {
        windowDuration: number;
        windowEnd: number;
    };
    slider?: {
        offsetX: number;
        width: number;
    };
}

export interface MinimapChart extends Chart<'line'> {
    options: MinimapOptions;
    windowNavigateCallback?: (windowCenter: number) => void;
    updateSlider?: (
        minimapRef: MinimapChart,
        windowEnd: number,
        windowDuration: number,
        liveMode: boolean
    ) => void;
    onSliderRangeChange?: (
        windowEnd: number,
        windowDuration: number,
        liveMode: boolean
    ) => void;
    redrawSlider?: () => void;
}

const Minimap = () => {
    const sessionActive = useSelector(isSessionActive);
    const lastLoadedTimeStamp = useRef(0);
    const dispatch = useDispatch();
    const showMinimap = useSelector(getShowMinimap);
    const minimapRef = useRef<MinimapChart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapSlider = useRef<HTMLDivElement | null>(null);
    const { windowEnd, windowDuration } = useSelector(getChartXAxisRange);
    const liveMode = useSelector(isLiveMode);
    const xAxisMax = useSelector(getXAxisMaxTime);
    const { yAxisLog } = useSelector(getChartYAxisRange);
    const isWindowDurationFull = DataManager().getTimestamp() > windowDuration;

    function windowNavigateCallback(windowCenter: number) {
        dispatch(panWindow(windowCenter));
    }

    minimapRef.current = initializeMinimapChart(
        minimapRef.current,
        canvasRef.current,
        yAxisLog
    );

    if (minimapRef.current) {
        minimapRef.current.windowNavigateCallback = windowNavigateCallback;
        minimapRef.current.updateSlider = (minimap, end, duration, live) => {
            updateSlider(minimap, minimapSlider.current, end, duration, live);
        };
    }

    useEffect(() => {
        if (minimapRef.current?.options.scales?.y) {
            minimapRef.current.options.scales.y.type = yAxisLog
                ? 'logarithmic'
                : 'linear';

            minimapScroll.updateMinimapData(minimapRef.current);
        }
    }, [yAxisLog]);

    useEffect(() => {
        if (
            minimapRef.current != null &&
            minimapSlider.current != null &&
            showMinimap
        ) {
            const resizeObserver = new ResizeObserver(() => {
                if (minimapRef.current) {
                    minimapRef.current.onSliderRangeChange?.(
                        windowEnd,
                        windowDuration,
                        liveMode
                    );
                }
            });

            resizeObserver.observe(minimapRef.current.canvas);

            return () => {
                minimapRef.current &&
                    resizeObserver.unobserve(minimapRef.current.canvas);
            };
        }
    }, [
        showMinimap,
        canvasRef.current?.style.display,
        liveMode,
        windowEnd,
        windowDuration,
    ]);

    useEffect(() => {
        if (!minimapRef.current) return;

        const nonNullRef = minimapRef.current;

        const newData = DataManager().getData(lastLoadedTimeStamp.current);
        const numberOfElements = newData.getLength();

        for (let index = 0; index < numberOfElements; index += 1) {
            const v = newData.getCurrentData(index);
            minimapScroll.onNewData(
                v,
                lastLoadedTimeStamp.current + indexToTimestamp(index)
            );
        }

        lastLoadedTimeStamp.current = DataManager().getTimestamp();

        minimapScroll.updateMinimapData(nonNullRef);
    }, [xAxisMax]);

    useEffect(() => {
        if (!minimapRef.current) return;
        const nonNullRef = minimapRef.current;

        if (!sessionActive || xAxisMax === 0) {
            minimapScroll.clearMinimap(nonNullRef);
        }
    }, [sessionActive, xAxisMax]);

    return (
        <div
            className="tw-relative tw-h-28 tw-w-full tw-py-4"
            style={{
                display: `${showMinimap ? 'block' : 'none'}`,
                paddingLeft: '4.3rem',
                paddingRight: '1.8rem',
            }}
        >
            {isWindowDurationFull ? null : MinimapDefaultState()}
            <canvas
                ref={canvasRef}
                id="minimap"
                className="tw-max-h-20 tw-w-full tw-border tw-border-solid"
                style={{
                    borderColor: colors.gray100,
                    display: isWindowDurationFull ? 'block' : 'none',
                }}
            />

            <div
                ref={minimapSlider}
                className="tw-pointer-events-none tw-absolute tw-max-h-20 tw-overflow-hidden tw-bg-gray-400 tw-opacity-50"
                style={{
                    contain: 'strict',
                    top: '1rem',
                    display: isWindowDurationFull ? 'block' : 'none',
                }}
            />
        </div>
    );
};

const MinimapDefaultState = () => (
    <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-bg-gray-100 tw-text-gray-700">
        Minimap - not enough data available...
    </div>
);

function drawSlider(
    minimap: MinimapChart,
    slider: HTMLDivElement,
    windowEnd: number,
    windowDuration: number,
    liveMode: boolean
) {
    if (DataManager().getTimestamp() === 0) {
        slider.style.display = 'none';
        return;
    }

    const {
        canvas,
        scales: { x: xScale },
    } = minimap;

    const canvasRectangle = canvas.getBoundingClientRect();
    const parentRectangle = canvas.parentElement?.getBoundingClientRect();
    if (parentRectangle == null) return;

    const offsetLeft = canvasRectangle.left - parentRectangle.left;

    let left = 0;
    let width = 0;
    if (liveMode) {
        // live has been toggled on, meaning that the window will be at the end.
        const MAX_WIDTH = canvasRectangle.width;
        width = xScale.getPixelForValue(windowDuration);
        width = width > MAX_WIDTH ? MAX_WIDTH : width;
        left = canvasRectangle.width + offsetLeft - width;
    } else {
        const beginWithoutOffset = xScale.getPixelForValue(
            Math.max(0, windowEnd - windowDuration)
        );

        const endWithoutOffset = xScale.getPixelForValue(windowEnd);

        const beginWithOffset =
            beginWithoutOffset > 0
                ? beginWithoutOffset + offsetLeft
                : offsetLeft;

        left = beginWithOffset;

        const MIN_WIDTH = 5;
        width = endWithoutOffset - beginWithoutOffset;
        width = width > MIN_WIDTH ? width : MIN_WIDTH;

        const windowOutsideSamples =
            width > canvasRectangle.right - canvasRectangle.left;
        if (windowOutsideSamples) {
            // When the window spans the entire sample, give the slider the width of the canvas.
            width = canvasRectangle.width;
        } else if (left + width > canvasRectangle.width + offsetLeft) {
            // Most likely, window is zoomed in so that the slider uses its
            // min-width, hence, we should offset it so that it does not move
            // outside the canvas.
            left = canvasRectangle.width + offsetLeft - width;
        }
    }

    const height = minimap.canvas.height;

    slider.style.left = `${left}px`;
    slider.style.width = `${width}px`;
    slider.style.height = `${height}px`;
    slider.style.display = 'block';

    return {
        offsetX: left - offsetLeft,
        width,
    };
}

function updateSlider(
    minimapRef: MinimapChart | null,
    minimapSliderRef: HTMLDivElement | null,
    windowEnd: number,
    windowDuration: number,
    liveMode: boolean
) {
    if (minimapRef == null || minimapSliderRef == null) return;

    const sliderMeta = drawSlider(
        minimapRef,
        minimapSliderRef,
        windowEnd,
        windowDuration,
        liveMode
    );

    const { options: chartOptions } = minimapRef;
    if (chartOptions.ampereChart == null) {
        chartOptions.ampereChart = {
            windowEnd,
            windowDuration,
        };
    } else {
        chartOptions.ampereChart.windowDuration = windowDuration;
        chartOptions.ampereChart.windowEnd = windowEnd;
    }

    if (sliderMeta) {
        if (chartOptions.slider == null) {
            chartOptions.slider = {
                offsetX: sliderMeta.offsetX,
                width: sliderMeta.width,
            };
        } else {
            chartOptions.slider.offsetX = sliderMeta.offsetX;
            chartOptions.slider.width = sliderMeta.width;
        }
    }
}

function initializeMinimapChart(
    minimapRef: MinimapChart | null,
    canvasRef: HTMLCanvasElement | null,
    yAxisLog: boolean
) {
    if (minimapRef != null) {
        return minimapRef;
    }

    if (canvasRef != null) {
        return new Chart(canvasRef, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'minimap',
                        fill: false,
                        borderColor: colors.primary,
                        data: [],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        pointHitRadius: 0,
                    },
                ],
            },
            options: {
                animation: false,
                layout: {
                    autoPadding: false,
                    padding: 0,
                },
                scales: {
                    x: {
                        type: 'linear',
                        display: false,
                        ticks: undefined,
                        grid: undefined,
                    },
                    y: {
                        type: yAxisLog ? 'logarithmic' : 'linear',
                        display: false,
                        ticks: undefined,
                        grid: undefined,
                    },
                },
            } as MinimapOptions,
            plugins: [minimapScroll],
        });
    }

    // If canvasRef is still null
    return null;
}

export default Minimap;
