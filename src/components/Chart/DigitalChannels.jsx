import React from 'react';
import { Line } from 'react-chartjs-2';
import { number, bool, arrayOf, shape } from 'prop-types';
import { rightMarginPx } from './chart.scss';
import crossHairPlugin from './plugins/chart.crossHair';
import colors from '../colors.scss';

const rightMargin = parseInt(rightMarginPx, 10);
const dataColor = colors.nordicBlue;

const bitsChartOptions = {
    scales: {
        xAxes: [
            {
                id: 'xScale',
                display: false,
                type: 'linear',
                ticks: {},
                tickMarkLength: 0,
                drawTicks: false,
                cursor: {},
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
    redraw: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    hover: { animationDuration: 0 },
    responsiveAnimationDuration: 0,
    legend: { display: false },
};

const DigitalChannels = ({
    bitsData,
    digitalChannels,
    bitIndexes,
    numberOfBits,
    cursorData: { begin, end, cursorBegin, cursorEnd },
}) => {
    const bitXaxis = bitsChartOptions.scales.xAxes[0];
    bitXaxis.ticks.min = begin;
    bitXaxis.ticks.max = end;
    bitXaxis.cursor.cursorBegin = cursorBegin;
    bitXaxis.cursor.cursorEnd = cursorEnd;
    const bitsChartData = bitsData
        .map((b, i) => ({
            datasets: [
                {
                    borderColor: dataColor,
                    borderWidth: 1.5,
                    fill: false,
                    data: b.slice(0, bitIndexes[i]),
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    pointHitRadius: 0,
                    pointBorderWidth: 0,
                    lineTension: 0,
                    label: `${i}`,
                    steppedLine: 'before',
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
            {numberOfBits === 0 && (
                <div className="info">
                    <p>Zoom in on the main chart to see the digital channels</p>
                </div>
            )}
        </div>
    );
};

DigitalChannels.propTypes = {
    bitsData: arrayOf(
        shape({
            x: number,
            y: number,
        })
    ).isRequired,
    digitalChannels: arrayOf(bool).isRequired,
    bitIndexes: arrayOf(number).isRequired,
    numberOfBits: number.isRequired,
    cursorData: shape({
        cursorBegin: number,
        cursorEnd: number,
        begin: number,
        end: number,
    }).isRequired,
};

export default DigitalChannels;
