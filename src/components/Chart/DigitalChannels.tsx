/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Line } from 'react-chartjs-2';
import { useSelector } from 'react-redux';
import { colors } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { ChartOptions, LineControllerDatasetOptions } from 'chart.js';

import { getWindowDuration } from '../../slices/chartSlice';
import { type CursorData } from './Chart';
import { DigitalChannelStates, DigitalChannelsType } from './data/dataTypes';
import crossHairPlugin from './plugins/chart.crossHair';

const dataColor = colors.nordicBlue;

interface DigitalChannelsProperties {
    lineData: DigitalChannelStates[];
    digitalChannels: DigitalChannelsType;
    zoomedOutTooFar: boolean;
    cursorData: CursorData;
}

const DigitalChannels = ({
    lineData,
    digitalChannels,
    zoomedOutTooFar,
    cursorData: { begin, end },
}: DigitalChannelsProperties) => {
    const windowDuration = useSelector(getWindowDuration);
    const bitsChartOptions: ChartOptions<'line'> = {
        scales: {
            x: {
                type: 'linear',
                display: false,
                min: begin > 0 ? begin : 0,
                max: begin > 0 ? end : windowDuration,
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
        <div className="scroll-bar-white-bg tw-preflight tw-relative tw-flex tw-flex-col tw-bg-white [@media(max-height:900px)]:tw-max-h-28 [@media(max-height:900px)]:tw-overflow-y-auto">
            {bitsChartData.map((_, i: number) => (
                <div
                    key={`${i + 1}`}
                    className="tw-flex tw-h-fit tw-flex-row tw-items-center tw-border-b tw-border-gray-200 tw-py-1 tw-pr-8 tw-text-center last:tw-border-none"
                >
                    <span className="tw-min-w-[70px] tw-text-center">
                        {bitsChartData[i].datasets[0].label}
                    </span>
                    <div
                        className="tw-flex tw-h-5 tw-grow"
                        style={{ contain: 'size' }}
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
                <div className="tw-absolute tw-bottom-0 tw-left-16 tw-right-0 tw-top-0 tw-flex tw-items-center tw-justify-center tw-overflow-hidden">
                    <p className="tw-bg-white tw-p-4">
                        Zoom in on the main chart to see the digital channels
                    </p>
                </div>
            )}
        </div>
    );
};

export default DigitalChannels;
