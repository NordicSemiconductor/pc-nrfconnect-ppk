/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import Chart, { ChartOptions, Plugin } from 'chart.js/auto';
import { ceil, floor, random, unit } from 'mathjs';
import { NumberInlineInput } from 'pc-nrfconnect-shared';

import './chart.css';

type LineObject = { x: number; y: number };

const createData = (size: number) => {
    const data = new Float32Array(size);
    return data.map(() => random(0, 20_000));
};

const samplesPerSecond = 1000;
const options = {
    samplingTime: undefined,
    samplesPerSecond,
    bits: null,
    index: 148,
    timestamp: 148 * (1e6 / samplesPerSecond),

    data: createData(148),
};

type ChartTop = {
    setInterval: (start: number, end: number) => void;
};
const ChartTop = ({ setInterval }: ChartTop) => {
    const [beginTime, setBeginTime] = useState(0);
    const [endTime, setEndTime] = useState(options.timestamp);

    console.log('renderedChartTop');

    const onComplete = (newBeginTime: number, newEndTime: number) => {
        setInterval(newBeginTime, newEndTime);
    };

    return (
        <>
            <NumberInlineInput
                value={beginTime}
                range={{ min: 0, max: options.timestamp }}
                onChange={setBeginTime}
                onChangeComplete={value => onComplete(value, endTime)}
            />
            <NumberInlineInput
                value={endTime}
                range={{ min: 0, max: options.timestamp }}
                onChange={setEndTime}
                onChangeComplete={value => onComplete(beginTime, value)}
            />
        </>
    );
};

const renderChart = (
    chartCanvasRef: HTMLCanvasElement | null,
    interval: { start: number; end: number }
) => {
    if (!chartCanvasRef) return;

    console.log(interval);

    const lineData = process(interval.start, interval.end);

    console.log(`length=${lineData.length}`);

    return new Chart(chartCanvasRef, {
        type: 'line',
        data: {
            datasets: [
                {
                    data: lineData,
                },
            ],
        },
        options: chartOptions,
    });
};

export default () => {
    const chartRef = useRef<Chart<'line'> | null>();
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);

    const [interval, setInterval] = useState({
        start: 0,
        end: options.timestamp,
    });

    const destroyChart = () => {
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }
    };

    useEffect(() => {
        console.log('intervalDidChange', interval);
        chartRef.current = renderChart(chartCanvasRef.current, interval);

        return () => destroyChart();
    }, [interval]);

    console.log('Rerendered!');
    return (
        <div className="charts-container">
            <ChartTop
                setInterval={(start, end) => {
                    console.log('setting interval');
                    setInterval({ start, end });
                }}
            />
            <div className="chart-wrapper">
                <canvas ref={chartCanvasRef} id="myChart" />
            </div>
        </div>
    );
};

const chartOptions: ChartOptions<'line'> = {
    animation: false,
    scales: {
        x: {
            type: 'linear',
            ticks: {
                callback: value => timestampToLabel(value),
                maxTicksLimit: 7,
            },
        },
        y: {
            type: 'linear',
            beginAtZero: true,
            ticks: {
                callback: microAmpere => formatCurrent(microAmpere),
                maxTicksLimit: 7,
            },
        },
    },
    plugins: {
        legend: {
            display: false,
        },
    },
};

// const renderChart = (
//    canvasReference: HTMLCanvasElement,
//    timestamps?: { startTime: number; endTime?: number }
// ) => {
//    const lineData =
//        timestamps == null
//            ? process()
//            : process(timestamps.startTime, timestamps.endTime);
//    console.log(lineData);
// };

const timestampToLabel = (microSeconds: string | number) => {
    if (typeof microSeconds !== 'number') {
        microSeconds = Number(microSeconds);
        if (Number.isNaN(microSeconds)) return;
    }

    const microSeccondsPerSecond = 1_000_000;
    const microSecondsPerMinute = 1_000_000 * 60;
    const microSecondsPerHour = 1_000_000 * 3600;

    let rest = microSeconds;

    const hours = floor(rest / microSecondsPerHour);
    rest -= hours * microSecondsPerHour;
    const minutes = floor(rest / microSecondsPerMinute);
    rest -= minutes * microSecondsPerMinute;
    const seconds = floor(rest / microSeccondsPerSecond);
    rest -= seconds * microSeccondsPerSecond;

    const timestamp = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const milliseconds = `${(rest / 1e3)
        .toFixed(3)
        .toString()
        .padStart(7, '0')}`;

    return [timestamp, milliseconds];
};

const formatCurrent = (microAmpere: number | string) => {
    if (typeof microAmpere === 'string') {
        microAmpere = Number(microAmpere);
        if (Number.isNaN(microAmpere)) {
            return;
        }
    }
    return unit(microAmpere, 'uA')
        .format({ notation: 'auto', precision: 4 })
        .replace('u', '\u00B5');
};

const timestampToIndex = (timestampInMicroseconds: number, toFloor = true) => {
    const timestampInSeconds = timestampInMicroseconds / 1e6;
    const index = timestampInSeconds / options.samplesPerSecond;
    return toFloor ? floor(index) : ceil(index);
};

const indexToTimestamp = (index: number) => {
    const microSecondsPerSample = 1e6 / options.samplesPerSecond;
    const timestampInMicroseconds = index * microSecondsPerSample;
    return timestampInMicroseconds;
};

const process = (
    beginTimeInMicroseconds = 0,
    endTimeInMicroseconds = options.timestamp
): LineObject[] => {
    const { timestamp, data } = options;
    const microSecondsPerSample = 1e6 / samplesPerSecond;

    endTimeInMicroseconds =
        endTimeInMicroseconds == null ? timestamp : endTimeInMicroseconds;
    const length =
        (endTimeInMicroseconds - beginTimeInMicroseconds) /
        microSecondsPerSample;

    const startIndex = timestampToIndex(beginTimeInMicroseconds);

    console.log(beginTimeInMicroseconds, endTimeInMicroseconds);
    console.log(length);
    console.log(startIndex);

    const ampereLine = new Array<{ y: number; x: number }>(length);
    return [...ampereLine].map((_value, relativeIndex) => {
        const index = startIndex + relativeIndex;
        return {
            y: data[index],
            x: microSecondsPerSample * index,
        };
    });
};
