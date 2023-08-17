import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { Chart, ChartOptions } from 'chart.js';
import { colors, useHotKey } from 'pc-nrfconnect-shared';

import minimapScroll from '../../components/Chart/plugins/minimap.scroll';
import { indexToTimestamp, options } from '../../globals';
import { chartState } from '../../slices/chartSlice';

export interface MinimapOptions extends ChartOptions<'line'> {
    ampereChart?: {
        windowDuration?: number | null;
        windowBegin?: number | null;
        windowEnd?: number | null;
    };
}

export interface MinimapChart extends Chart<'line'> {
    options: MinimapOptions;
}

const Minimap = () => {
    const minimapRef = useRef<MinimapChart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapSlider = useRef<HTMLDivElement | null>(null);
    const { windowBegin, windowEnd } = useSelector(chartState);

    useHotKey({
        hotKey: 'alt+d',
        title: 'Draw Minimap',
        isGlobal: false,
        action: () => {
            if (minimapRef.current) {
                initialiseMinimapData(minimapRef.current);
            }
        },
    });

    if (minimapRef.current == null && canvasRef.current != null) {
        minimapRef.current = new Chart(canvasRef.current, {
            type: 'line',
            data: {
                labels: undefined,
                datasets: [
                    {
                        label: 'minimap',
                        fill: false,
                        borderColor: colors.primary,
                        pointRadius: 0,
                        data: [],
                    },
                ],
            },
            options: {
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
    }

    return (
        <div className="tw-relative tw-h-20">
            <div
                ref={minimapSlider}
                className="tw-absolute tw-bg-gray-400 tw-opacity-50 tw-top-0 tw-h-full"
            />
            <canvas
                ref={canvasRef}
                id="minimap"
                className="tw-h-20 tw-w-full tw-border-solid tw-border tw-border-gray800"
            />
        </div>
    );
};

function initialiseMinimapData(minimap: MinimapChart) {
    const dataBuffer = [];

    for (let i = 0; i < options.index; i += 1000) {
        dataBuffer.push({
            x: indexToTimestamp(i),
            y: options.data[i],
        });
    }

    minimap.data.datasets[0].data = dataBuffer;
    minimap.update();
}

function drawSlider(
    minimap: MinimapChart,
    slider: HTMLDivElement,
    windowBegin: number | null,
    windowEnd: number | null
) {
    if (windowBegin == null || windowEnd == null) return;

    const {
        scales: { x: xScale },
    } = minimap;

    const begin = xScale.getPixelForValue(windowBegin);
    const end = xScale.getPixelForValue(windowEnd);
    const width = end - begin;

    slider.style.left = `${begin}px`;
    slider.style.width = `${width}px`;
}

export default Minimap;
