/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { Chart, ChartOptions } from 'chart.js';
import { colors } from 'pc-nrfconnect-shared';

import minimapScroll from '../../components/Chart/plugins/minimap.scroll';
import {
    chartState,
    showMinimap as getShowMinimap,
} from '../../slices/chartSlice';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';

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

interface Minimap {
    windowNavigateCallback?: (windowCenter: number) => void;
}

const Minimap = ({ windowNavigateCallback }: Minimap) => {
    const isDataLoggerPane = useSelector(isDataLoggerPaneSelector);
    const showMinimap = useSelector(getShowMinimap);
    const minimapRef = useRef<MinimapChart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapSlider = useRef<HTMLDivElement | null>(null);
    const { windowBegin, windowEnd, windowDuration } = useSelector(chartState);

    if (minimapRef.current == null && canvasRef.current != null) {
        minimapRef.current = new Chart(canvasRef.current, {
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

    if (minimapRef.current && minimapSlider.current) {
        drawSlider(
            minimapRef.current,
            minimapSlider.current,
            windowBegin,
            windowEnd
        );

        const { options: chartOptions } = minimapRef.current;
        if (chartOptions.ampereChart == null) {
            chartOptions.ampereChart = {
                windowDuration,
            };
        } else {
            chartOptions.ampereChart.windowDuration = windowDuration;
        }
    }

    if (minimapRef.current && windowNavigateCallback) {
        minimapRef.current.windowNavigateCallback = windowNavigateCallback;
    }
    const hideMinimap = !showMinimap || !isDataLoggerPane;

    return (
        <div
            className="tw-relative tw-h-28 tw-w-full tw-py-4"
            style={{
                display: `${hideMinimap ? 'none' : 'block'}`,
                paddingLeft: '4.3rem',
                paddingRight: '1.8rem',
            }}
        >
            <canvas
                ref={canvasRef}
                id="minimap"
                className="tw-max-h-20 tw-w-full tw-border-solid tw-border tw-border-gray800"
            />
            <div
                ref={minimapSlider}
                className="tw-max-h-20 tw-absolute tw-bg-gray-400 tw-opacity-50 tw-pointer-events-none tw-overflow-hidden"
                style={{ contain: 'strict', top: '1rem', minWidth: '1rem' }}
            />
        </div>
    );
};

function drawSlider(
    minimap: MinimapChart,
    slider: HTMLDivElement,
    windowBegin: number | null,
    windowEnd: number | null
) {
    if (windowBegin == null || windowEnd == null) return;

    const {
        canvas,
        scales: { x: xScale },
    } = minimap;

    const canvasRectangle = canvas.getBoundingClientRect();
    const parentRectangle = canvas.parentElement?.getBoundingClientRect();
    if (parentRectangle == null) return;

    const offsetLeft = canvasRectangle.left - parentRectangle.left;

    const beginWithoutOffset = xScale.getPixelForValue(windowBegin);
    const endWithoutOffset = xScale.getPixelForValue(windowEnd);

    const beginWithOffset = beginWithoutOffset + offsetLeft;
    const windowOutsideSamples = beginWithOffset < offsetLeft;
    const left = windowOutsideSamples ? offsetLeft : beginWithOffset;

    const adjustWidth = windowOutsideSamples
        ? offsetLeft - beginWithoutOffset
        : 0;

    const width = endWithoutOffset - beginWithoutOffset - adjustWidth;

    const height = minimap.canvas.height;

    slider.style.left = `${left}px`;
    slider.style.width = `${width}px`;
    slider.style.height = `${height}px`;
}

export default Minimap;
