/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { MutableRefObject } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { useDispatch, useSelector } from 'react-redux';
import { BigNumber, Fraction, unit } from 'mathjs';
import { Toggle } from 'pc-nrfconnect-shared';

import {
    chartState,
    resetChart,
    toggleYAxisLock,
    toggleYAxisLog,
} from '../../slices/chartSlice';
import { dataLoggerState } from '../../slices/dataLoggerSlice';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';
import { AmpereChartJS } from './AmpereChart';
// @ts-expect-error Is currently a jsx file
import ChartOptions from './ChartOptions';

import './charttop.scss';

type TimeWindowButton = {
    label: string;
    zoomToWindow: (duration: number | BigNumber | Fraction) => void;
};
const TimeWindowButton = ({ label, zoomToWindow }: TimeWindowButton) => (
    <Button
        variant="secondary"
        size="sm"
        onClick={() => zoomToWindow(unit(label).to('us').toNumeric())}
    >
        {label}
    </Button>
);

type ChartTop = {
    chartPause: () => void;
    zoomToWindow: (windowDuration: number | BigNumber | Fraction) => void;
    chartRef: MutableRefObject<AmpereChartJS | null>;
    windowDuration: number;
};

const ChartTop = ({
    chartPause,
    zoomToWindow,
    chartRef,
    windowDuration,
}: ChartTop) => {
    const dispatch = useDispatch();
    const { windowBegin, windowEnd, yAxisLock, yAxisLog } =
        useSelector(chartState);
    const { maxFreqLog10, sampleFreqLog10 } = useSelector(dataLoggerState);
    const isDataLoggerPane = useSelector(isDataLoggerPaneSelector);
    const live = windowBegin === 0 && windowEnd === 0;

    const timeWindowLabels = [
        '10ms',
        '100ms',
        '1s',
        '3s',
        '10s',
        '1min',
        '10min',
        '1h',
        '6h',
        '1day',
        '1week',
    ].slice(maxFreqLog10 - sampleFreqLog10, maxFreqLog10 - sampleFreqLog10 + 6);

    return (
        <div className="chart-top d-flex justify-content-between align-items-center my-2 flex-row">
            <div className="settings-y-axis">
                <Toggle
                    label="LOGARITHMIC Y-AXIS"
                    onToggle={() => {
                        dispatch(toggleYAxisLog());
                    }}
                    isToggled={yAxisLog}
                    variant="primary"
                    labelRight
                />
                <Toggle
                    label="LOCK Y-AXIS"
                    onToggle={() => {
                        if (yAxisLock) {
                            dispatch(
                                toggleYAxisLock({ yMin: null, yMax: null })
                            );
                            zoomToWindow(windowDuration);
                        } else {
                            const { min: yMin, max: yMax } = chartRef.current
                                ?.scales?.yScale ?? {
                                min: null,
                                max: null,
                            };
                            dispatch(toggleYAxisLock({ yMin, yMax }));
                        }
                    }}
                    isToggled={yAxisLock}
                    variant="primary"
                    labelRight
                />
                {yAxisLock && <ChartOptions chartRef={chartRef} />}
            </div>
            {isDataLoggerPane && (
                <ButtonGroup>
                    {timeWindowLabels.map(label => (
                        <TimeWindowButton
                            label={label}
                            key={label}
                            zoomToWindow={zoomToWindow}
                        />
                    ))}
                </ButtonGroup>
            )}
            {isDataLoggerPane && (
                <Toggle
                    label="LIVE VIEW"
                    onToggle={() => {
                        live ? chartPause() : dispatch(resetChart());
                    }}
                    isToggled={live}
                    variant="primary"
                />
            )}
        </div>
    );
};

export default ChartTop;
