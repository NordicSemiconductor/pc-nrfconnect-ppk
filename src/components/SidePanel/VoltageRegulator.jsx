/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
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
import { string } from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Form from 'react-bootstrap/Form';
import BootstrapCollapse from 'react-bootstrap/Collapse';

import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';

import { updateRegulator } from '../../actions/deviceActions';
import Collapse from './Collapse';

import { appState } from '../../reducers/appReducer';
import {
    voltageRegulatorState,
    moveVoltageRegulatorVddAction,
} from '../../reducers/voltageRegulatorReducer';

const VoltageRegulator = ({ eventKey }) => {
    const dispatch = useDispatch();
    const { vdd, min, max } = useSelector(voltageRegulatorState);
    const {
        isSmuMode,
        capabilities: { ppkSetPowerMode },
    } = useSelector(appState);

    const isVoltageSettable = !ppkSetPowerMode || isSmuMode;

    return (
        <BootstrapCollapse in={isVoltageSettable}>
            <div>
                <Collapse heading="VOLTAGE ADJUSTMENT" eventKey={eventKey}>
                    <Form.Label htmlFor="slider-vdd">
                        <span className="flex-fill">Supply</span>
                        <NumberInlineInput
                            value={vdd}
                            range={{ min, max }}
                            onChange={value =>
                                dispatch(moveVoltageRegulatorVddAction(value))
                            }
                            onChangeComplete={() =>
                                dispatch(updateRegulator(vdd))
                            }
                        />{' '}
                        mV
                    </Form.Label>
                    <Slider
                        id="slider-vdd"
                        values={[vdd]}
                        range={{ min, max }}
                        onChange={[
                            value =>
                                dispatch(moveVoltageRegulatorVddAction(value)),
                        ]}
                        onChangeComplete={() => dispatch(updateRegulator(vdd))}
                    />
                </Collapse>
            </div>
        </BootstrapCollapse>
    );
};

VoltageRegulator.propTypes = {
    eventKey: string.isRequired,
};

export default VoltageRegulator;
