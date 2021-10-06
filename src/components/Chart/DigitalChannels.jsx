/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Line } from 'react-chartjs-2';
import { arrayOf, bool, exact, number, shape } from 'prop-types';

import crossHairPlugin from './plugins/chart.crossHair';

import colors from '../colors.icss.scss';
import chartCss from './chart.icss.scss';

const { rightMarginPx } = chartCss;

const rightMargin = parseInt(rightMarginPx, 10);
const dataColor = colors.nordicBlue;

const DigitalChannels = ({
    lineData,
    digitalChannels,
    zoomedOutTooFar,
    cursorData: { begin, end, cursorBegin, cursorEnd },
}) => {
    const bitsChartOptions = {
        scales: {
            xAxes: [
                {
                    id: 'xScale',
                    display: false,
                    type: 'linear',
                    ticks: {
                        min: begin,
                        max: end,
                    },
                    tickMarkLength: 0,
                    drawTicks: false,
                    cursor: {
                        cursorBegin,
                        cursorEnd,
                    },
                },
            ],
            yAxes: [
                {
                    type: 'linear',
                    display: false,
                    ticks: {
                        min: -0.5,
                        max: 0.5,
                    },
                },
            ],
        },
        maintainAspectRatio: false,
        animation: { duration: 0 },
        hover: { animationDuration: 0 },
        responsiveAnimationDuration: 0,
        legend: { display: false },
    };

    const commonLineData = {
        backgroundColor: dataColor,
        borderColor: dataColor,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        pointBorderWidth: 0,
        lineTension: 0,
        steppedLine: 'before',
    };

    const bitsChartData = lineData
        .map((singleBitLineData, i) => ({
            datasets: [
                {
                    ...commonLineData,
                    fill: false,
                    data: singleBitLineData.mainLine,
                    label: String(i),
                },
                {
                    ...commonLineData,
                    fill: '-1',
                    data: singleBitLineData.uncertaintyLine,
                    label: `uncertainty ${i}`, // This label is not displayed, just needed as an internal key
                },
            ],
        }))
        .filter((_, i) => digitalChannels[i]);
    return (
        <div className="chart-bits-container">
            {bitsChartData.map((_, i) => (
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

const lineData = arrayOf(
    shape({
        x: number.isRequired,
        y: number,
    }).isRequired
).isRequired;

DigitalChannels.propTypes = {
    lineData: arrayOf(
        exact({ mainLine: lineData, uncertaintyLine: lineData }).isRequired
    ).isRequired,
    digitalChannels: arrayOf(bool).isRequired,
    zoomedOutTooFar: bool.isRequired,
    cursorData: shape({
        cursorBegin: number,
        cursorEnd: number,
        begin: number,
        end: number,
    }).isRequired,
};

export default DigitalChannels;
