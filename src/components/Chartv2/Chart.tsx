/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { floor, random } from 'mathjs';

import './chart.css';

const createData = (size: number) => {
    const data = new Float32Array(size);
    return data.map(() => random(0, 20_000));
};

type LineObject = { x: number; y: number };

const process = (data: Float32Array): LineObject[] => {
    const microSecondsPerSample = 1e6 / 100;
    let fakeIndex = 40_000;
    return [...Array(data.length)].map((_value, index) => {
        fakeIndex += 1;
        return {
            y: data[index],
            x: microSecondsPerSample * fakeIndex,
        };
    });
};

const globalData = createData(1000);

export default () => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current == null) return;

        initializeChart(chartRef.current);
    }, [chartRef]);

    console.log('Rerendered!');

    return (
        <div className="chart-wrapper">
            <canvas ref={chartRef} id="myChart" />
        </div>
    );
};

const initializeChart = (reference: HTMLCanvasElement) => {
    const lineData = process(globalData);
    // eslint-disable-next-line no-new
    new Chart(reference, {
        type: 'line',
        data: {
            datasets: [
                {
                    data: lineData,
                },
            ],
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    min: lineData[0].x,
                    ticks: {
                        callback: value => timestampToLabel(value),
                        maxTicksLimit: 7,
                    },
                },
                y: {
                    type: 'linear',
                    beginAtZero: true,
                },
            },
        },
    });
};

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
