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

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { func, shape } from 'prop-types';

import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { Toggle } from 'pc-nrfconnect-shared';

import {
    goLive,
    toggleYAxisLock,
    chartState,
} from '../../reducers/chartReducer';

import './charttop.scss';

const ChartTop = ({ chartPause, zoomToWindow, chartRef }) => {
    const dispatch = useDispatch();
    const { windowBegin, windowEnd, yAxisLock } = useSelector(chartState);
    const live = windowBegin === 0 && windowEnd === 0;

    return (
        <div className="chart-top d-flex flex-row justify-content-between align-items-center my-2">
            <Toggle
                label="LOCK Y-AXIS"
                onToggle={() => {
                    if (yAxisLock) {
                        dispatch(toggleYAxisLock());
                    } else {
                        const {
                            min,
                            max,
                        } = chartRef.current.chartInstance.scales.yScale;
                        dispatch(toggleYAxisLock(min, max));
                    }
                }}
                isToggled={yAxisLock}
                variant="secondary"
                labelRight
            />
            <ButtonGroup>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => zoomToWindow(10000)}
                >
                    10ms
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => zoomToWindow(100000)}
                >
                    100ms
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => zoomToWindow(1000000)}
                >
                    1s
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => zoomToWindow(10000000)}
                >
                    10s
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => zoomToWindow(60000000)}
                >
                    1min
                </Button>
            </ButtonGroup>
            <Toggle
                label="LIVE VIEW"
                onToggle={() => (live ? chartPause() : dispatch(goLive()))}
                isToggled={live}
                variant="secondary"
            />
        </div>
    );
};

ChartTop.propTypes = {
    chartPause: func.isRequired,
    zoomToWindow: func.isRequired,
    chartRef: shape({}).isRequired,
};

export default ChartTop;
