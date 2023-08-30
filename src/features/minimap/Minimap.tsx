/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Chart, ChartOptions } from 'chart.js';
import { colors } from 'pc-nrfconnect-shared';

import minimapScroll from '../../components/Chart/plugins/minimap.scroll';
import { options } from '../../globals';
import { chartState, panWindow } from '../../slices/chartSlice';
import { showMinimap as getShowMinimap } from './minimapSlice';

export interface MinimapOptions extends ChartOptions<'line'> {
    ampereChart?: {
        windowDuration?: number | null;
        windowBegin?: number | null;
        windowEnd?: number | null;
    };
}

export interface MinimapChart extends Chart<'line'> {
    options: MinimapOptions;
    windowNavigateCallback?: (windowCenter: number) => void;
}

const Minimap = () => {
    const dispatch = useDispatch();
    const showMinimap = useSelector(getShowMinimap);
    const minimapRef = useRef<MinimapChart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapSlider = useRef<HTMLDivElement | null>(null);
    const { windowBegin, windowEnd, windowDuration } = useSelector(chartState);

    function windowNavigateCallback(windowCenter: number) {
        dispatch(panWindow(windowCenter));
    }

    minimapRef.current = initializeMinimapChart(
        minimapRef.current,
        canvasRef.current
    );

    updateSlider(
        minimapRef.current,
        minimapSlider.current,
        windowBegin,
        windowEnd,
        windowDuration
    );

    if (minimapRef.current) {
        minimapRef.current.windowNavigateCallback = windowNavigateCallback;
    }

    useEffect(() => {
        if (
            minimapRef.current != null &&
            minimapSlider.current != null &&
            showMinimap
        ) {
            drawSlider(
                minimapRef.current,
                minimapSlider.current,
                windowBegin,
                windowEnd,
                windowDuration
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showMinimap, canvasRef.current?.style.display]);

    return (
        <div
            className="tw-relative tw-h-28 tw-w-full tw-py-4"
            style={{
                display: `${showMinimap ? 'block' : 'none'}`,
                paddingLeft: '4.3rem',
                paddingRight: '1.8rem',
            }}
        >
            {options.index === 0 ||
            minimapRef.current?.data.datasets[0].data.length === 0
                ? MinimapDefaultState()
                : null}
            <canvas
                ref={canvasRef}
                id="minimap"
                className="tw-max-h-20 tw-w-full tw-border-solid tw-border"
                style={{
                    borderColor: colors.gray100,
                    display: options.index === 0 ? 'none' : 'block',
                }}
            />
            <div
                ref={minimapSlider}
                className="tw-max-h-20 tw-absolute tw-bg-gray-400 tw-opacity-50 tw-pointer-events-none tw-overflow-hidden"
                style={{ contain: 'strict', top: '1rem' }}
            />
        </div>
    );
};

const MinimapDefaultState = () => (
    <div
        className="tw-h-full tw-w-full tw-flex tw-items-center tw-justify-center"
        style={{ backgroundColor: colors.gray100 }}
    >
        Minimap - not enough data available...
    </div>
);

function drawSlider(
    minimap: MinimapChart,
    slider: HTMLDivElement,
    windowBegin: number | null,
    windowEnd: number | null,
    windowDuration: number | null
) {
    if (windowBegin == null || windowEnd == null || options.index === 0) {
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
    if (windowBegin === 0 && windowEnd === 0 && windowDuration != null) {
        // Since options.index !== 0 and both begin and end are 0, it means that
        // live has been toggled on, meaning that the window will be at the end.
        const MAX_WIDTH = canvasRectangle.width;
        width = xScale.getPixelForValue(windowDuration);
        width = width > MAX_WIDTH ? MAX_WIDTH : width;
        left = canvasRectangle.width + offsetLeft - width;
    } else {
        const beginWithoutOffset =
            windowBegin !== 0 ? xScale.getPixelForValue(windowBegin) : 0;
        const endWithoutOffset = xScale.getPixelForValue(windowEnd);

        const beginWithOffset =
            beginWithoutOffset > 0
                ? beginWithoutOffset + offsetLeft
                : offsetLeft;

        left = beginWithOffset;

        const MIN_WIDTH = 16;
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
}

function updateSlider(
    minimapRef: MinimapChart | null,
    minimapSliderRef: HTMLDivElement | null,
    windowBegin: number | null,
    windowEnd: number | null,
    windowDuration: number | null
) {
    if (minimapRef == null || minimapSliderRef == null) return;

    drawSlider(
        minimapRef,
        minimapSliderRef,
        windowBegin,
        windowEnd,
        windowDuration
    );

    const { options: chartOptions } = minimapRef;
    if (chartOptions.ampereChart == null) {
        chartOptions.ampereChart = {
            windowDuration,
        };
    } else {
        chartOptions.ampereChart.windowDuration = windowDuration;
    }
}

function initializeMinimapChart(
    minimapRef: MinimapChart | null,
    canvasRef: HTMLCanvasElement | null
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
                        type: 'linear',
                        display: false,
                        ticks: undefined,
                        grid: undefined,
                    },
                },
                ampereChart: {},
            } as MinimapOptions,
            plugins: [minimapScroll],
        });
    }

    // If canvasRef is still null
    return null;
}

export default Minimap;
