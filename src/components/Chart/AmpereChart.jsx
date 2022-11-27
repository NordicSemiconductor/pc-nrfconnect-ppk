/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Line } from 'react-chartjs-2';
import { useDispatch, useSelector } from 'react-redux';
import { unit } from 'mathjs';
import { colors } from 'pc-nrfconnect-shared';
import { arrayOf, func, number, shape } from 'prop-types';

import { updateTriggerLevel as updateTriggerLevelAction } from '../../actions/deviceActions';
import { indexToTimestamp } from '../../globals';
import { appState } from '../../slices/appSlice';
import { chartState } from '../../slices/chartSlice';
import { triggerLevelSetAction, triggerState } from '../../slices/triggerSlice';
import { isRealTimePane as isRealTimePaneSelector } from '../../utils/panes';
import crossHairPlugin from './plugins/chart.crossHair';
import dragSelectPlugin from './plugins/chart.dragSelect';
import triggerLevelPlugin from './plugins/chart.triggerLevel';
import triggerOriginPlugin from './plugins/chart.triggerOrigin';
import zoomPanPlugin from './plugins/chart.zoomPan';

import chartCss from './chart.icss.scss';

const { rightMarginPx, yAxisWidthPx } = chartCss;

const valueRange = { min: 0, max: undefined };
const yAxisWidth = parseInt(yAxisWidthPx, 10);
const rightMargin = parseInt(rightMarginPx, 10);
const dataColor = colors.nordicBlue;

const formatCurrent = uA =>
    unit(uA, 'uA')
        .format({ notation: 'auto', precision: 4 })
        .replace('u', '\u00B5');

const AmpereChart = ({
    setLen,
    setChartAreaWidth,
    step,
    chartRef,
    cursorData: { begin, end },
    lineData,
}) => {
    const dispatch = useDispatch();
    const {
        triggerLevel,
        triggerRunning,
        triggerSingleWaiting,
        externalTrigger,
        triggerOrigin,
    } = useSelector(triggerState);
    const {
        windowBegin,
        windowEnd,
        windowDuration,
        cursorBegin,
        cursorEnd,
        yMin,
        yMax,
        timestampsVisible,
    } = useSelector(chartState);
    const { samplingRunning } = useSelector(appState);
    const isRealTimePane = useSelector(isRealTimePaneSelector);
    const sendTriggerLevel = level => dispatch(updateTriggerLevelAction(level));
    const updateTriggerLevel = level =>
        dispatch(triggerLevelSetAction({ triggerLevel: level }));

    const timestampToLabel = React.useCallback(
        (_usecs, index, array) => {
            let usecs = _usecs;
            if (triggerOrigin != null) {
                usecs -= indexToTimestamp(triggerOrigin);
            }
            const microseconds = Math.abs(usecs);
            const sign = usecs < 0 ? '-' : '';
            if (!array) {
                return `${sign}${Number(microseconds / 1e3).toFixed(3)} ms`;
            }
            if (index > 0 && index < array.length - 1) {
                const first = array[0] - indexToTimestamp(triggerOrigin);
                const last =
                    array[array.length - 1] - indexToTimestamp(triggerOrigin);
                const range = last - first;
                if (usecs - first < range / 8 || last - usecs < range / 8) {
                    return undefined;
                }
            }
            const d = new Date(microseconds / 1e3);
            const h = d.getUTCHours().toString().padStart(2, '0');
            const m = d.getUTCMinutes().toString().padStart(2, '0');
            const s = d.getUTCSeconds().toString().padStart(2, '0');

            const time = `${sign}${h}:${m}:${s}`;
            const subsecond = `${Number((microseconds / 1e3) % 1e3).toFixed(
                3
            )}`.padStart(7, '0');

            return [time, subsecond];
        },
        [triggerOrigin]
    );

    const live =
        windowBegin === 0 &&
        windowEnd === 0 &&
        (samplingRunning || triggerRunning || triggerSingleWaiting);
    const snapping = step <= 0.16 && !live;

    const pointRadius = step <= 0.08 ? 4 : 2;
    const chartData = {
        datasets: [
            {
                borderColor: dataColor,
                borderWidth: step > 2 ? 1 : 1.5,
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
                lineTension: snapping ? 0.2 : 0,
                label: 'Current',
                yAxisID: 'yScale',
                labelCallback: ({ y }) => formatCurrent(y),
            },
        ],
    };

    const chartOptions = {
        scales: {
            xScale: {
                type: 'linear',
                display: true,
                min: begin,
                max: end,
                ticks: {
                    display: timestampsVisible,
                    autoSkipPadding: 25,
                    callback: timestampToLabel,
                    maxTicksLimit: 7,
                },
                grid: {
                    drawBorder: true,
                    drawOnChartArea: true,
                },
                cursor: { cursorBegin, cursorEnd },
                afterFit: scale => {
                    scale.paddingRight = rightMargin;
                },
            },
            yScale: {
                type: 'logarithmic',
                min: yMin === null ? valueRange.min : yMin,
                max: yMax === null ? valueRange.max : yMax,
                ticks: {
                    maxTicksLimit: 7,
                    callback: uA => (uA < 0 ? '' : formatCurrent(uA)),
                },
                grid: {
                    drawBorder: true,
                    drawOnChartArea: true,
                },
                afterFit: scale => {
                    scale.width = yAxisWidth;
                },
            },
        },
        maintainAspectRatio: false,
        animation: false,
        formatX: timestampToLabel,
        formatY: formatCurrent,
        triggerLevel,
        triggerActive: triggerRunning || triggerSingleWaiting,
        sendTriggerLevel,
        updateTriggerLevel,
        snapping,
        live,
        triggerHandleVisible: isRealTimePane && !externalTrigger,
        triggerOrigin,
        windowDuration,
    };

    const plugins = [
        dragSelectPlugin,
        zoomPanPlugin,
        triggerLevelPlugin(dispatch),
        triggerOriginPlugin,
        crossHairPlugin,
        {
            id: 'notifier',
            afterLayout(chart) {
                const { chartArea, width } = chart;
                chartArea.right = width - rightMargin;
                const { left, right } = chart.chartArea;
                const w = Math.trunc(right - left);
                setLen(Math.min(w, 2000));
                setChartAreaWidth(w);
            },
        },
    ];

    return (
        <div className="chart-container">
            <Line
                ref={chartRef}
                data={chartData}
                options={chartOptions}
                plugins={plugins}
            />
        </div>
    );
};

AmpereChart.propTypes = {
    setLen: func.isRequired,
    setChartAreaWidth: func.isRequired,
    step: number.isRequired,
    chartRef: shape({}).isRequired,
    cursorData: shape({
        begin: number.isRequired,
        end: number.isRequired,
    }).isRequired,
    lineData: arrayOf(
        shape({
            x: number,
            y: number,
        })
    ),
};

export default AmpereChart;
