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
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Card from 'react-bootstrap/Card';

import {
    updateResistors,
    resetResistors,
} from '../actions/deviceActions';

import {
    updateHighResistorAction,
    updateMidResistorAction,
    updateLowResistorAction,
    resistorCalibrationState,
} from '../reducers/resistorCalibrationReducer';

export default () => {
    const dispatch = useDispatch();
    const {
        resistorLow,
        resistorMid,
        resistorHigh,
    } = useSelector(resistorCalibrationState);

    return (
        <Card>
            <Card.Header>
                <Accordion.Toggle as={Button} variant="link" eventKey="4">
                    Resistor Calibration
                </Accordion.Toggle>
            </Card.Header>
            <Accordion.Collapse eventKey="4">
                <Card.Body>
                    <InputGroup>
                        <InputGroup.Prepend>
                            <InputGroup.Text>High</InputGroup.Text>
                        </InputGroup.Prepend>
                        <Form.Control
                            type="text"
                            value={resistorHigh}
                            onChange={e => dispatch(
                                updateHighResistorAction(e.target.value),
                            )}
                            onKeyPress={e => {
                                if (e.key === 'Enter') {
                                    dispatch(updateResistors());
                                }
                            }}
                        />
                    </InputGroup>
                    <InputGroup>
                        <InputGroup.Prepend>
                            <InputGroup.Text>Mid</InputGroup.Text>
                        </InputGroup.Prepend>
                        <Form.Control
                            type="text"
                            value={resistorMid}
                            onChange={e => updateMidResistorAction(e.target.value)}
                            onKeyPress={e => {
                                if (e.key === 'Enter') {
                                    dispatch(updateResistors());
                                }
                            }}
                        />
                    </InputGroup>
                    <InputGroup>
                        <InputGroup.Prepend>
                            <InputGroup.Text>Low</InputGroup.Text>
                        </InputGroup.Prepend>
                        <Form.Control
                            type="text"
                            value={resistorLow}
                            onChange={e => dispatch(
                                updateLowResistorAction(e.target.value),
                            )}
                            onKeyPress={e => {
                                if (e.key === 'Enter') {
                                    dispatch(updateResistors());
                                }
                            }}
                        />
                    </InputGroup>
                    <div className="d-flex flex-column">
                        <ButtonGroup style={{ marginTop: 10 }}>
                            <Button
                                onClick={() => dispatch(updateResistors())}
                                variant="light"
                            >
                                <span className="mdi mdi-refresh" />Update
                            </Button>
                            <Button
                                onClick={() => dispatch(resetResistors())}
                                variant="light"
                            >
                                <span className="mdi mdi-cancel" />Reset
                            </Button>
                        </ButtonGroup>
                    </div>
                </Card.Body>
            </Accordion.Collapse>
        </Card>
    );
};
