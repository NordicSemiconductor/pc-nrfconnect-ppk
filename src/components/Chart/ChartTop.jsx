/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { useDispatch, useSelector } from 'react-redux';
import { unit } from 'mathjs';
import { Toggle } from 'pc-nrfconnect-shared';
import { func, number, shape, string } from 'prop-types';

import {
    chartState,
    resetChart,
    toggleYAxisLock,
} from '../../reducers/chartReducer';
import { dataLoggerState } from '../../reducers/dataLoggerReducer';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';
import ChartOptions from './ChartOptions';

import './charttop.scss';

const TimeWindowButton = ({ label, zoomToWindow }) => (
    <Button
        variant="secondary"
        size="sm"
        onClick={() => zoomToWindow(unit(label).to('us').toNumeric())}
    >
        {label}
    </Button>
);

TimeWindowButton.propTypes = {
    label: string.isRequired,
    zoomToWindow: func.isRequired,
};

const ChartTop = ({ chartPause, zoomToWindow, chartRef, windowDuration }) => {
    const dispatch = useDispatch();
    const { windowBegin, windowEnd, yAxisLock } = useSelector(chartState);
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
        <div className="chart-top d-flex flex-row justify-content-between align-items-center my-2">
            <div className="settings-y-axis">
                <Toggle
                    label="LOCK Y-AXIS"
                    onToggle={() => {
                        if (yAxisLock) {
                            dispatch(toggleYAxisLock(null, null));
                            zoomToWindow(windowDuration);
                        } else {
                            const { min, max } =
                                chartRef.current.chartInstance.scales.yScale;
                            dispatch(toggleYAxisLock(min, max));
                        }
                    }}
                    isToggled={yAxisLock}
                    variant="secondary"
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
                    onToggle={() =>
                        live ? chartPause() : dispatch(resetChart())
                    }
                    isToggled={live}
                    variant="primary"
                />
            )}
        </div>
    );
};

ChartTop.propTypes = {
    chartPause: func.isRequired,
    zoomToWindow: func.isRequired,
    chartRef: shape({}).isRequired,
    windowDuration: number.isRequired,
};

export default ChartTop;
