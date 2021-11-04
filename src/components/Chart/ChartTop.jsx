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
import { colors, Toggle } from 'pc-nrfconnect-shared';
import { func, shape, string } from 'prop-types';

import {
    chartState,
    resetCursorAndChart,
    toggleYAxisLock,
} from '../../reducers/chartReducer';
import { dataLoggerState } from '../../reducers/dataLoggerReducer';
import { isDataLoggerPane as isDataLoggerPaneSelector } from '../../utils/panes';

import './charttop.scss';

const { gray700, nordicBlue } = colors;

const TimeWindowButton = ({ label, zoomToWindow }) => {
    return (
        <Button
            variant="secondary"
            size="sm"
            onClick={() => zoomToWindow(unit(label).to('us').toNumeric())}
        >
            {label}
        </Button>
    );
};

TimeWindowButton.propTypes = {
    label: string.isRequired,
    zoomToWindow: func.isRequired,
};

const ChartTop = ({ chartPause, zoomToWindow, chartRef }) => {
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
            <Toggle
                label="LOCK Y-AXIS"
                onToggle={() => {
                    if (yAxisLock) {
                        dispatch(toggleYAxisLock());
                    } else {
                        const { min, max } =
                            chartRef.current.chartInstance.scales.yScale;
                        dispatch(toggleYAxisLock(min, max));
                    }
                }}
                isToggled={yAxisLock}
                variant="secondary"
                labelRight
                barColor={gray700}
                barColorToggled={nordicBlue}
            />
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
                        live ? chartPause() : dispatch(resetCursorAndChart())
                    }
                    isToggled={live}
                    variant="secondary"
                    barColor={gray700}
                    barColorToggled={nordicBlue}
                />
            )}
        </div>
    );
};

ChartTop.propTypes = {
    chartPause: func.isRequired,
    zoomToWindow: func.isRequired,
    chartRef: shape({}).isRequired,
};

export default ChartTop;
