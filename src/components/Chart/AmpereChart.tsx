/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Line } from 'react-chartjs-2';
import type {
    ChartJSOrUndefined,
    ForwardedRef,
} from 'react-chartjs-2/dist/types';
import { useSelector } from 'react-redux';
import {
    classNames,
    colors,
    Spinner,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { Chart, ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import { unit } from 'mathjs';

import { isSamplingRunning } from '../../slices/appSlice';
import {
    getChartYAxisRange,
    getCursorRange,
    getWindowDuration,
    isLiveMode,
    isTimestampsVisible,
} from '../../slices/chartSlice';
import { type CursorData } from './Chart';
import { AmpereState } from './data/dataTypes';
import crossHairPlugin from './plugins/chart.crossHair';
import dragSelectPlugin, { DragSelect } from './plugins/chart.dragSelect';
import zoomPanPlugin, { ZoomPan } from './plugins/chart.zoomPan';

import chartCss from './chart.icss.scss';

const { rightMarginPx, yAxisWidthPx } = chartCss;

const yAxisWidth = parseInt(yAxisWidthPx, 10);
const rightMargin = parseInt(rightMarginPx, 10);
const dataColor = colors.nordicBlue;

interface Cursor {
    cursorBegin?: null | number;
    cursorEnd?: null | number;
}

export interface AmpereChartOptions extends ChartOptions<'line'> {
    formatX: (usecs: number) => string | string[] | undefined;
    formatY: (current: number) => string;
    snapping: boolean;
    live: boolean;
    windowDuration: number;
    cursor: Cursor;
    id?: string;
}

interface AmpereChartConfigurations extends ChartConfiguration<'line'> {
    options: AmpereChartOptions;
}

export interface AmpereChartJS extends Chart<'line'> {
    options: AmpereChartOptions;
    dragSelect?: DragSelect;
    zoomPan?: ZoomPan;
    sampleFrequency?: number;
    triggerLine: Pick<AmpereState, 'y'>;
    config: AmpereChartConfigurations;
}

interface AmpereChartProperties {
    setNumberOfPixelsInWindow: (length: number) => void;
    setChartAreaWidth: (width: number) => void;
    numberOfSamplesPerPixel: number;
    chartRef: React.MutableRefObject<null | AmpereChartJS>;
    cursorData: CursorData;
    lineData: AmpereState[];
    processing: boolean;
}

const formatCurrent = (nA: number) =>
    typeof nA === 'number'
        ? unit(nA, 'nA')
              .format({ notation: 'auto', precision: 4 })
              .replace('u', '\u00B5')
        : (undefined as never);

const timestampToLabel = (usecs: number) => {
    const microseconds = Math.abs(usecs);
    const sign = usecs < 0 ? '-' : '';

    const d = new Date(microseconds / 1e3);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    const s = d.getUTCSeconds().toString().padStart(2, '0');

    const time = `${sign}${h}:${m}:${s}`;
    const subsecond = `${Number((microseconds / 1e3) % 1e3).toFixed(
        3
    )}`.padStart(7, '0');

    return [time, subsecond];
};

export default ({
    setNumberOfPixelsInWindow,
    setChartAreaWidth,
    numberOfSamplesPerPixel,
    chartRef,
    cursorData: { begin, end },
    lineData,
    processing,
}: AmpereChartProperties) => {
    const liveMode = useSelector(isLiveMode);
    const { yMin, yMax, yAxisLog } = useSelector(getChartYAxisRange);
    const timestampsVisible = useSelector(isTimestampsVisible);
    const { cursorBegin, cursorEnd } = useSelector(getCursorRange);
    const windowDuration = useSelector(getWindowDuration);
    const samplingRunning = useSelector(isSamplingRunning);

    const live = liveMode && samplingRunning;
    const snapping = numberOfSamplesPerPixel <= 0.16 && !live;

    const pointRadius = numberOfSamplesPerPixel <= 0.08 ? 4 : 2;
    const chartDataSets: ChartData<'line', AmpereState[]> = {
        datasets: [
            {
                borderColor: dataColor,
                borderWidth: numberOfSamplesPerPixel > 2 ? 1 : 1.5,
                fill: false,
                data: lineData,
                pointRadius: snapping ? pointRadius : 0,
                pointHoverRadius: snapping ? pointRadius : 0,
                pointHitRadius: snapping ? pointRadius : 0,
                pointBackgroundColor: colors.white,
                pointHoverBackgroundColor: dataColor,
                pointBorderWidth: 1.5,
                pointHoverBorderWidth: 1.5,
                pointBorderColor: dataColor,
                pointHoverBorderColor: dataColor,
                tension: snapping ? 0.2 : 0,
                label: 'Current',
                xAxisID: 'xScale',
                yAxisID: 'yScale',
            },
        ],
    };

    const chartOptions: AmpereChartOptions = {
        scales: {
            xScale: {
                type: 'linear',
                display: true,
                min: begin > 0 ? begin : 0,
                max: begin > 0 ? end : windowDuration,
                ticks: {
                    display: timestampsVisible,
                    autoSkipPadding: 25,
                    callback: value =>
                        timestampToLabel(Number.parseInt(value.toString(), 10)),
                    maxTicksLimit: 7,
                },
                border: {
                    display: true,
                },
                grid: {
                    drawOnChartArea: true,
                },
                afterFit: scale => {
                    scale.paddingRight = rightMargin;
                },
            },
            yScale: {
                type: yAxisLog ? 'logarithmic' : 'linear',
                min: yMin != null ? yMin : undefined,
                max: yMax != null ? yMax : undefined,
                ticks: {
                    maxTicksLimit: 7,
                    callback: nA =>
                        typeof nA === 'number' && nA >= 0
                            ? formatCurrent(nA)
                            : '',
                },
                border: {
                    display: true,
                },
                grid: {
                    drawOnChartArea: true,
                },
                afterFit: scale => {
                    scale.width = yAxisWidth;
                },
            },
        },
        parsing: false,
        maintainAspectRatio: false,
        animation: false,
        formatX: timestampToLabel,
        formatY: formatCurrent,
        snapping,
        live,
        windowDuration,
        cursor: { cursorBegin, cursorEnd },
        id: 'ampereChart',
    };

    const plugins = [
        dragSelectPlugin,
        zoomPanPlugin,
        crossHairPlugin,
        {
            id: 'notifier',
            afterLayout(chart: Chart) {
                const { chartArea, width } = chart;
                chartArea.right = width - rightMargin;
                const { left, right } = chart.chartArea;
                const w = Math.trunc(right - left);
                setNumberOfPixelsInWindow(Math.min(w, 2000));
                setChartAreaWidth(w);
            },
        },
    ];

    return (
        <div className="chart-container">
            {processing && (
                <div
                    className={classNames(
                        'tw-absolute tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-pl-[4.35rem] tw-pr-[1.8rem]',
                        timestampsVisible ? 'tw-pb-[54px]' : 'tw-pb-[21px]'
                    )}
                >
                    <div className="tw-relative tw-top-[10px] tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-bg-gray-300 tw-bg-opacity-20 tw-px-[70px]">
                        <Spinner
                            size="lg"
                            className=" tw-text-nordicBlue-900"
                        />
                    </div>
                </div>
            )}
            <Line
                ref={chartRef as ForwardedRef<ChartJSOrUndefined<'line'>>}
                // Need to typecast because of react-chartjs-2
                data={chartDataSets as ChartData<'line'>}
                options={chartOptions}
                plugins={plugins}
            />
        </div>
    );
};
