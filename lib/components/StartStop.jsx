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
import Button from 'react-bootstrap/Button';

import {
    averageStart,
    averageStop,
    toggleDUT,
    setPowerMode,
} from '../actions/deviceActions';

export default () => {
    const dispatch = useDispatch();

    const {
        deviceRunning,
        rttRunning,
        capabilities,
        isSmuMode,
    } = useSelector(({ app }) => app.app);
    const { averageRunning } = useSelector(({ app }) => app.average);

    return (
        <>
            {capabilities.ppkAverageStart && (
                <div className="d-flex flex-column">
                    <Button
                        variant="primary"
                        size="lg"
                        disabled={!rttRunning}
                        onClick={() => dispatch(
                            averageRunning ? averageStop() : averageStart(),
                        )}
                    >
                        <span className={`mdi mdi-${averageRunning ? 'stop' : 'play'}`} />
                        {averageRunning ? 'Stop' : 'Start'}
                    </Button>
                </div>
            )}
            {capabilities.ppkToggleDUT && (
                <div className="d-flex flex-column">
                    <Button
                        style={{ backgroundColor: 0xFF11AA }}
                        variant="light"
                        size="lg"
                        disabled={!rttRunning}
                        onClick={() => dispatch(toggleDUT(deviceRunning))}
                    >
                        <span className={`mdi mdi-${deviceRunning ? 'close-circle-outline' : 'record-circle-outline'}`} />
                        {deviceRunning ? 'Power OFF' : 'Power ON'}
                    </Button>
                </div>
            )}
            {capabilities.ppkSetPowerMode && (
                <div className="d-flex flex-column">
                    <Button
                        style={{ backgroundColor: 0xFF11AA }}
                        variant="light"
                        size="lg"
                        disabled={!rttRunning}
                        onClick={() => dispatch(setPowerMode(isSmuMode))}
                    >
                        <span className={`mdi mdi-${isSmuMode ? 'flash' : 'flash-auto'}`} />
                        {isSmuMode ? 'Source Meter' : 'Amperemeter'}
                    </Button>
                </div>
            )}
        </>
    );
};
