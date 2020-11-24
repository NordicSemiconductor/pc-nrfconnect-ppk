/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import { Slider } from 'pc-nrfconnect-shared';
import { unit } from 'mathjs';

import NumberWithUnit from './NumberWithUnitInput';

import {
    samplingStart,
    samplingStop,
    setupOptions,
} from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';

import Group from './Group';

import {
    updateSampleFreqLog10,
    updateDurationSeconds,
    dataLoggerState,
} from '../../reducers/dataLoggerReducer';

export default () => {
    const dispatch = useDispatch();

    const { rttRunning, samplingRunning } = useSelector(appState);
    const {
        sampleFreqLog10,
        sampleFreq,
        durationSeconds,
        maxPower10,
    } = useSelector(dataLoggerState);

    const ramSize = sampleFreq * durationSeconds * 4;

    const startButtonTooltip = `Start sampling at ${unit(sampleFreq, 'Hz')
        .format({ notation: 'fixed', precision: 1 })
        .replace('.0', '')}`;

    const startStopTitle = !samplingRunning ? startButtonTooltip : undefined;

    const change = useCallback(
        value => dispatch(updateDurationSeconds(value)),
        [dispatch]
    );
    const completeChange = useCallback(() => dispatch(setupOptions()), [
        dispatch,
    ]);

    const units = [
        { name: 'days', multiplier: 24 * 60 * 60, min: 1, max: 500 }, // 1Hz
        { name: 'days', multiplier: 24 * 60 * 60, min: 1, max: 50 }, // 10Hz
        { name: 'hours', multiplier: 60 * 60, min: 1, max: 120 }, // 100Hz
        { name: 'hours', multiplier: 60 * 60, min: 1, max: 12 }, // 1kHz
        { name: 'minutes', multiplier: 60, min: 1, max: 72 }, // 7.7-10kHz
        { name: 'seconds', multiplier: 1, min: 60, max: 432 }, // 100kHz
    ];
    const selectedUnit = units[sampleFreqLog10];

    return (
        <Group>
            <div className={samplingRunning ? 'disabled' : ''}>
                <Form.Label htmlFor="data-logger-sampling-frequency">
                    {sampleFreq} samples per second
                </Form.Label>
                <Slider
                    id="data-logger-sampling-frequency"
                    values={[sampleFreqLog10]}
                    range={{ min: 0, max: maxPower10 }}
                    onChange={[value => dispatch(updateSampleFreqLog10(value))]}
                    onChangeComplete={completeChange}
                    disabled={samplingRunning}
                />
                <NumberWithUnit
                    label="Sample for"
                    unit={selectedUnit.name}
                    multiplier={selectedUnit.multiplier}
                    range={selectedUnit}
                    value={durationSeconds}
                    onChange={change}
                    onChangeComplete={completeChange}
                    disabled={samplingRunning}
                    slider
                />
            </div>
            <div className="small">
                Estimated RAM required{' '}
                {unit(ramSize, 'byte')
                    .to('MB')
                    .format({ notation: 'fixed', precision: 1 })}
                <br />
                {unit(1 / sampleFreq, 's')
                    .format({
                        notation: 'fixed',
                        precision: 1,
                    })
                    .replace('.0', '')}{' '}
                period
            </div>
            <Button
                title={startStopTitle}
                className={`w-100 start-btn my-3 ${
                    samplingRunning ? 'active-anim' : ''
                }`}
                variant="set"
                disabled={!rttRunning}
                onClick={() =>
                    dispatch(samplingRunning ? samplingStop() : samplingStart())
                }
            >
                {samplingRunning ? 'Stop' : 'Start'}
            </Button>
        </Group>
    );
};
