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
import { useDispatch, useSelector } from 'react-redux';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';

import Slider from './Slider/Slider';
import InlineInput from './Slider/InlineInput';

import { updateRegulator } from '../actions/deviceActions';
import { moveVoltageRegulatorVddAction } from '../actions/uiActions';

import SwitchPoints from './SwitchPoints';
import ResistorCalibration from './ResistorCalibration';

export default () => {
    const dispatch = useDispatch();
    const { vdd } = useSelector(({ app }) => app.voltageRegulator);
    const { advancedMode } = useSelector(({ app }) => app.app);

    return (
        <Accordion defaultActiveKey="2">
            <Card>
                <Card.Header>
                    <Accordion.Toggle as={Button} variant="link" eventKey="2">
                        Voltage Regulator
                    </Accordion.Toggle>
                </Card.Header>
                <Accordion.Collapse eventKey="2">
                    <Card.Body>
                        <Form.Label htmlFor="slider-vdd">
                            VDD{' '}
                            <InlineInput
                                value={vdd}
                                range={{ min: 1800, max: 5000 }}
                                onChange={value => dispatch(moveVoltageRegulatorVddAction(value))}
                                onChangeComplete={value => dispatch(updateRegulator(value))}
                            />
                            {' '}mV
                        </Form.Label>
                        <Slider
                            id="slider-vdd"
                            values={[vdd]}
                            range={{ min: 1800, max: 5000 }}
                            onChange={[value => dispatch(moveVoltageRegulatorVddAction(value))]}
                            onChangeComplete={value => dispatch(updateRegulator(value))}
                        />
                    </Card.Body>
                </Accordion.Collapse>
            </Card>
            {advancedMode && <SwitchPoints />}
            {advancedMode && <ResistorCalibration />}
        </Accordion>
    );
};
