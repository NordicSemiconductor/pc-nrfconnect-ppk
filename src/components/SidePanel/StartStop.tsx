/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { unit } from 'mathjs';
import { Group, Slider } from 'pc-nrfconnect-shared';

import { samplingStart, samplingStop } from '../../actions/deviceActions';
import { appState } from '../../slices/appSlice';
import {
    dataLoggerState,
    updateDurationSeconds,
    updateSampleFreqLog10,
} from '../../slices/dataLoggerSlice';
import NumberWithUnit from './NumberWithUnitInput';

const fmtOpts = { notation: 'fixed' as const, precision: 1 };

export default () => {
    const dispatch = useDispatch();

    const { samplingRunning } = useSelector(appState);
    const {
        sampleFreqLog10,
        sampleFreq,
        durationSeconds,
        maxFreqLog10,
        range,
    } = useSelector(dataLoggerState);

    const ramSize = sampleFreq * durationSeconds * 4;
    const period = 1 / sampleFreq;
    const formattedRamSize = unit(ramSize, 'byte').to('MB').format(fmtOpts);
    const formattedPeriod = unit(period, 's').format(fmtOpts).replace('.0', '');
    const startButtonTooltip = `Start sampling at ${unit(sampleFreq, 'Hz')
        .format(fmtOpts)
        .replace('.0', '')}`;

    const startStopTitle = !samplingRunning ? startButtonTooltip : undefined;

    return (
        <Group heading="Sampling parameters">
            <div className={samplingRunning ? 'disabled' : ''}>
                <div className="sample-frequency-group">
                    <Form.Label htmlFor="data-logger-sampling-frequency">
                        {sampleFreq.toLocaleString('en')} samples per second
                    </Form.Label>
                    <Slider
                        ticks
                        id="data-logger-sampling-frequency"
                        values={[sampleFreqLog10]}
                        range={{ min: 0, max: maxFreqLog10 }}
                        onChange={[
                            v =>
                                dispatch(
                                    updateSampleFreqLog10({
                                        sampleFreqLog10: v,
                                    })
                                ),
                        ]}
                        onChangeComplete={() => {}}
                    />
                </div>
                <NumberWithUnit
                    label="Sample for"
                    unit={range.name}
                    multiplier={range.multiplier}
                    range={range}
                    value={durationSeconds}
                    onChange={(v: number) =>
                        dispatch(updateDurationSeconds({ durationSeconds: v }))
                    }
                    slider
                />
            </div>
            <div className="small buffer-summary">
                Estimated RAM required {formattedRamSize}
                <br />
                {formattedPeriod} period
            </div>
            {samplingRunning ? (
                <Button
                    title={startStopTitle}
                    className="w-100 secondary-btn start-stop active-anim"
                    variant="secondary"
                    onClick={() => dispatch(samplingStop())}
                >
                    <span className="mdi mdi-stop-circle" />
                    Stop
                </Button>
            ) : (
                <Button
                    title={startStopTitle}
                    className="w-100 secondary-btn start-stop"
                    variant="secondary"
                    onClick={() => dispatch(samplingStart())}
                >
                    <span className="mdi mdi-play-circle" />
                    Start
                </Button>
            )}
        </Group>
    );
};
