import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { Chart, ChartOptions } from 'chart.js';
import { colors, logger, useHotKey } from 'pc-nrfconnect-shared';

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

// interface MinimapConfigurations extends ChartConfiguration<'line'> {
//     options: MinimapOptions;
// }

export interface MinimapChart extends Chart<'line'> {
    options: MinimapOptions;
    // config: MinimapConfigurations;
}

const Minimap = () => {
    const minimapRef = useRef<MinimapChart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const scrollRectangleRef = useRef<HTMLDivElement | null>(null);
    const { windowBegin, windowEnd } = useSelector(chartState);

    useHotKey({
        hotKey: 'alt+d',
        title: 'Draw Minimap',
        isGlobal: false,
        action: () => {
            if (minimapRef.current) {
                updateMinimapData(minimapRef.current);
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

    /*
     Probably do not use windowDuration, but pass the duration in to the plugin somehow.
     Need a way of figuring out when to update the minimap.

     1. Start by drawing a grey triangle in the sight of the window, in order to simulate the window
     2. Start implementing scrolling.
     */

    if (minimapRef.current) {
        console.log('Doing some window update');
        drawRectangle(minimapRef.current, windowBegin, windowEnd);
    }

    return (
        <>
            <canvas
                ref={canvasRef}
                id="minimap"
                className="tw-h-20 tw-w-full tw-border-solid tw-border-2 tw-border-black"
            />
            <div
                ref={scrollRectangleRef}
                className="tw-absolute tw-bg-gray-400"
            />
        </>
    );
};

function updateMinimapData(minimap: MinimapChart) {
    logger.info('Updating data of minimap');
    const dataBuffer = [];

    for (let i = 0; i < options.data.length; i += 1000) {
        dataBuffer.push({
            x: indexToTimestamp(i),
            y: options.data[i],
        });
    }

    minimap.data.datasets[0].data = dataBuffer;
    minimap.update();
}

function drawRectangle(
    minimap: MinimapChart,
    windowBegin: number | null,
    windowEnd: number | null
) {
    if (windowBegin == null || windowEnd == null) return;

    const {
        ctx,
        scales: { x: xScale },
    } = minimap;
    const { canvas } = ctx;

    const begin = xScale.getPixelForValue(windowBegin);
    const end = xScale.getPixelForValue(windowEnd);

    const x = begin;
    const y = 0;
    const width = end - begin;
    const height = canvas.height;
    console.log(`begin=${begin}, end=${end} and width=${width}`);

    console.log(`${x},${y},${height},${width}`);

    if (x == null || width == null) {
        logger.debug('Could not retrieve pixel value of x or width');
        return;
    }

    ctx.fillStyle = colors.gray400;
    ctx.fillRect(x, y, width, height);
}

export default Minimap;
