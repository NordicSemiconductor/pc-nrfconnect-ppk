/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions, LineControllerDatasetOptions } from 'chart.js';
import { colors } from 'pc-nrfconnect-shared';

import { DigitalChannelStates, DigitalChannelsType } from './data/dataTypes';
import crossHairPlugin from './plugins/chart.crossHair';

import chartCss from './chart.icss.scss';

const { rightMarginPx } = chartCss;

const rightMargin = parseInt(rightMarginPx, 10);
const dataColor = colors.nordicBlue;

interface DigitalChannelsProperties {
    lineData: DigitalChannelStates[];
    digitalChannels: DigitalChannelsType;
    zoomedOutTooFar: boolean;
    cursorData: {
        begin: number;
        end: number;
        cursorBegin?: number | null;
        cursorEnd?: number | null;
    };
}

const DigitalChannels = ({
    lineData,
    digitalChannels,
    zoomedOutTooFar,
    cursorData: { begin, end },
}: DigitalChannelsProperties) => {
    const bitsChartOptions: ChartOptions<'line'> = {
        scales: {
            x: {
                type: 'linear',
                display: false,
                min: begin,
                max: end,
                ticks: {
                    display: false,
                    callback: () => undefined, // override chart.js tick callback which fails on resuming profiling
                },
            },
            y: {
                type: 'linear',
                display: false,
                min: -0.5,
                max: 0.5,
            },
        },
        maintainAspectRatio: false,
        animation: false,
    };

    const commonLineData: Partial<LineControllerDatasetOptions> = {
        backgroundColor: dataColor,
        borderColor: dataColor,
        borderWidth: 1.5,
        pointStyle: false,
        stepped: 'before',
    };

    const bitsChartData = lineData
        .map((singleBitLineData: DigitalChannelStates, i: number) => ({
            datasets: [
                {
                    ...commonLineData,
                    fill: false,
                    data: singleBitLineData.mainLine,
                    label: String(i),
                },
                {
                    ...commonLineData,
                    fill: false,
                    showLine: false,
                    data: singleBitLineData.uncertaintyLine,
                    label: `uncertainty ${i}`, // This label is not displayed, just needed as an internal key
                },
            ],
        }))
        .filter((_, i) => digitalChannels[i]);
    return (
        <div className="chart-bits-container">
            {bitsChartData.map((_, i: number) => (
                <div key={`${i + 1}`} className="chart-bits">
                    <span>{bitsChartData[i].datasets[0].label}</span>
                    <div
                        className="chart-container"
                        style={{ paddingRight: `${rightMargin}px` }}
                    >
                        <Line
                            data={bitsChartData[i]}
                            options={bitsChartOptions}
                            plugins={[crossHairPlugin]}
                        />
                    </div>
                </div>
            ))}
            {zoomedOutTooFar && (
                <div className="info">
                    <p>Zoom in on the main chart to see the digital channels</p>
                </div>
            )}
        </div>
    );
};

export default DigitalChannels;
