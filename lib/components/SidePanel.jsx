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
import PropTypes from 'prop-types';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Card from 'react-bootstrap/Card';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Slider from './Slider/Slider';
import InlineInput from './Slider/InlineInput';

import 'react-rangeslider/lib/index.css';

const SidePanel = ({
    ppkUpdateRegulator,
    averageStart,
    averageStop,
    averageRunning,
    spikeFiltering,
    deviceRunning,
    rttRunning,
    ppkToggleDUT,
    voltageRegulatorVdd,
    moveVoltageRegulatorVddAction,
    resistorLow,
    resistorMid,
    resistorHigh,
    updateHighResistorAction,
    updateMidResistorAction,
    updateLowResistorAction,
    updateResistors,
    resetResistors,
    spikeFilteringToggle,
    switchUpHigh,
    switchUpLow,
    switchDownHigh,
    switchDownLow,
    switchUpSliderPosition,
    switchDownSliderPosition,
    switchingPointUpMoved,
    switchingPointDownMovedAction,
    ppkSwitchingPointsUpSet,
    ppkSwitchingPointsDownSet,
    ppkSwitchingPointsReset,
    bindHotkey,
    toggleAdvancedModeAction,
    advancedMode,
    hidden,
}) => {
    bindHotkey('alt+ctrl+shift+a', toggleAdvancedModeAction);

    return (
        <div className={`core-side-panel${hidden ? ' hidden' : ''}${rttRunning ? '' : ' disabled'}`}>
            <div className="d-flex flex-column">
                <Button
                    variant="primary"
                    size="lg"
                    disabled={!rttRunning}
                    onClick={averageRunning ? averageStop : averageStart}
                >
                    <span className={`mdi mdi-${averageRunning ? 'stop' : 'play'}`} />
                    {averageRunning ? 'Stop' : 'Start'}
                </Button>
            </div>
            <div className="d-flex flex-column">
                <Button
                    style={{ backgroundColor: 0xFF11AA }}
                    variant="light"
                    size="lg"
                    disabled={!rttRunning}
                    onClick={() => ppkToggleDUT(deviceRunning)}
                >
                    <span className={`mdi mdi-${deviceRunning ? 'close-circle-outline' : 'record-circle-outline'}`} />
                    {deviceRunning ? 'Power OFF' : 'Power ON'}
                </Button>
            </div>

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
                                    value={voltageRegulatorVdd}
                                    range={{ min: 1850, max: 3600 }}
                                    onChange={moveVoltageRegulatorVddAction}
                                    onChangeComplete={ppkUpdateRegulator}
                                />
                                {' '}mV
                            </Form.Label>
                            <Slider
                                id="slider-vdd"
                                values={[voltageRegulatorVdd]}
                                range={{ min: 1850, max: 3600 }}
                                onChange={[moveVoltageRegulatorVddAction]}
                                onChangeComplete={ppkUpdateRegulator}
                            />
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
                { advancedMode && (
                    <Card>
                        <Card.Header>
                            <Accordion.Toggle as={Button} variant="link" eventKey="3">
                                Switch levels
                            </Accordion.Toggle>
                        </Card.Header>
                        <Accordion.Collapse eventKey="3">
                            <Card.Body>
                                Switch up
                                <Slider
                                    values={[switchUpSliderPosition]}
                                    range={{ min: 38, max: 175 }}
                                    onChange={[switchingPointUpMoved]}
                                    onChangeComplete={ppkSwitchingPointsUpSet}
                                />
                                <Row className="mb-3">
                                    <Col>{`${switchUpLow.toFixed(2)} uA`}</Col>
                                    <Col className="text-right">{`${switchUpHigh.toFixed(2)} mA`}</Col>
                                </Row>

                                Switch down
                                <Slider
                                    values={[switchDownSliderPosition]}
                                    range={{ min: 100, max: 400 }}
                                    onChange={[switchingPointDownMovedAction]}
                                    onChangeComplete={ppkSwitchingPointsDownSet}
                                />
                                <Row className="mb-3">
                                    <Col>{`${switchDownLow.toFixed(2)} uA`}</Col>
                                    <Col className="text-right">{`${switchDownHigh.toFixed(2)} mA`}</Col>
                                </Row>

                                <Button
                                    onClick={ppkSwitchingPointsReset}
                                    variant="light"
                                    className="mt-3"
                                >
                                    Reset switch levels
                                </Button>
                                <Form.Group controlId="spikeCheck">
                                    <Form.Check
                                        type="checkbox"
                                        onChange={spikeFilteringToggle}
                                        checked={spikeFiltering}
                                        label="Spike filtering"
                                    />
                                </Form.Group>
                            </Card.Body>
                        </Accordion.Collapse>
                    </Card>
                )}
                {advancedMode && (
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
                                        onChange={e => updateHighResistorAction(e.target.value)}
                                        onKeyPress={e => { if (e.key === 'Enter') { updateResistors(); } }}
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
                                        onKeyPress={e => { if (e.key === 'Enter') { updateResistors(); } }}
                                    />
                                </InputGroup>
                                <InputGroup>
                                    <InputGroup.Prepend>
                                        <InputGroup.Text>Low</InputGroup.Text>
                                    </InputGroup.Prepend>
                                    <Form.Control
                                        type="text"
                                        value={resistorLow}
                                        onChange={e => updateLowResistorAction(e.target.value)}
                                        onKeyPress={e => { if (e.key === 'Enter') { updateResistors(); } }}
                                    />
                                </InputGroup>
                                <div className="d-flex flex-column">
                                    <ButtonGroup style={{ marginTop: 10 }}>
                                        <Button
                                            onClick={updateResistors}
                                            variant="light"
                                        >
                                            <span className="mdi mdi-refresh" />Update
                                        </Button>
                                        <Button
                                            onClick={resetResistors}
                                            variant="light"
                                        >
                                            <span className="mdi mdi-cancel" />Reset
                                        </Button>
                                    </ButtonGroup>
                                </div>
                            </Card.Body>
                        </Accordion.Collapse>
                    </Card>
                )}
            </Accordion>
        </div>
    );
};

SidePanel.propTypes = {
    ppkUpdateRegulator: PropTypes.func.isRequired,

    averageStart: PropTypes.func.isRequired,
    averageStop: PropTypes.func.isRequired,
    averageRunning: PropTypes.bool.isRequired,
    spikeFiltering: PropTypes.bool.isRequired,

    deviceRunning: PropTypes.bool.isRequired,
    rttRunning: PropTypes.bool.isRequired,
    ppkToggleDUT: PropTypes.func.isRequired,

    voltageRegulatorVdd: PropTypes.number.isRequired,
    moveVoltageRegulatorVddAction: PropTypes.func.isRequired,

    resistorLow: PropTypes.number.isRequired,
    resistorMid: PropTypes.number.isRequired,
    resistorHigh: PropTypes.number.isRequired,

    updateHighResistorAction: PropTypes.func.isRequired,
    updateMidResistorAction: PropTypes.func.isRequired,
    updateLowResistorAction: PropTypes.func.isRequired,
    updateResistors: PropTypes.func.isRequired,
    resetResistors: PropTypes.func.isRequired,

    spikeFilteringToggle: PropTypes.func.isRequired,

    switchUpHigh: PropTypes.number.isRequired,
    switchUpLow: PropTypes.number.isRequired,
    switchDownHigh: PropTypes.number.isRequired,
    switchDownLow: PropTypes.number.isRequired,

    switchUpSliderPosition: PropTypes.number.isRequired,
    switchDownSliderPosition: PropTypes.number.isRequired,
    switchingPointUpMoved: PropTypes.func.isRequired,
    switchingPointDownMovedAction: PropTypes.func.isRequired,
    ppkSwitchingPointsUpSet: PropTypes.func.isRequired,
    ppkSwitchingPointsDownSet: PropTypes.func.isRequired,
    ppkSwitchingPointsReset: PropTypes.func.isRequired,

    bindHotkey: PropTypes.func.isRequired,
    toggleAdvancedModeAction: PropTypes.func.isRequired,
    advancedMode: PropTypes.bool.isRequired,

    hidden: PropTypes.bool.isRequired,
};

export default SidePanel;
