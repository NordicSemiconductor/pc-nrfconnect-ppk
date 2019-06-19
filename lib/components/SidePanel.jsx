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

import Slider from 'react-rangeslider';
import 'react-rangeslider/lib/index.css';

import UnitSelector from './UnitSelector';

import {
    ADC_SAMPLING_TIME_US,
} from '../constants';

const SidePanel = ({
    ppkUpdateRegulator,
    averageStart,
    averageStop,
    averageRunning,
    externalTrigger,
    spikeFiltering,
    deviceRunning,
    rttRunning,
    ppkToggleDUT,
    triggerSingleWaiting,
    triggerRunning,
    ppkTriggerUpdateWindow,
    ppkTriggerStart,
    ppkTriggerStop,
    triggerUnitChangeAction,
    ppkTriggerSet,
    ppkTriggerSingleSet,
    triggerUnit,
    triggerWindowLength,
    moveTriggerWindowLengthAction,
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
    externalTriggerToggled,
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

            <Accordion defaultActiveKey="1">
                <Card>
                    <Card.Header>
                        <Accordion.Toggle as={Button} variant="link" eventKey="1">
                            Trigger
                        </Accordion.Toggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey="1">
                        <Card.Body>
                            Window {triggerWindowLength} ms
                            <Slider
                                disabled={!rttRunning}
                                min={(450 * ADC_SAMPLING_TIME_US) / 1e3}
                                max={(4000 * ADC_SAMPLING_TIME_US) / 1e3}
                                value={triggerWindowLength}
                                labels={{ 1: '5.85', 100: '52' }}
                                format={n => `${n}ms`}
                                onChange={moveTriggerWindowLengthAction}
                                tooltip={false}
                                onChangeComplete={
                                    () => ppkTriggerUpdateWindow(triggerWindowLength)
                                }
                            />
                            <div className="d-flex flex-column">
                                <ButtonGroup style={{ marginTop: 10 }}>
                                    <Button
                                        disabled={!rttRunning || externalTrigger}
                                        size="lg"
                                        variant="light"
                                        style={{ width: '50%' }}
                                        onClick={triggerSingleWaiting
                                            ? ppkTriggerStop : ppkTriggerSingleSet}
                                    >
                                        <span className="mdi mdi-clock-outline" />
                                        {triggerSingleWaiting ? 'Waiting...' : 'Single'}
                                    </Button>
                                    <Button
                                        disabled={!rttRunning || externalTrigger}
                                        size="lg"
                                        variant="light"
                                        style={{ width: '50%' }}
                                        onClick={triggerRunning
                                            ? ppkTriggerStop : ppkTriggerStart}
                                    >
                                        <span className={`mdi mdi-${triggerRunning ? 'flash' : 'record-circle-outline'}`} />
                                        {triggerRunning ? 'Stop' : 'Start'}
                                    </Button>
                                </ButtonGroup>
                            </div>
                            <InputGroup style={{ marginTop: 10 }}>
                                <InputGroup.Prepend>
                                    <InputGroup.Text>Trigger level</InputGroup.Text>
                                </InputGroup.Prepend>
                                <Form.Control
                                    disabled={!rttRunning || externalTrigger}
                                    placeholder="1"
                                    type="text"
                                    onKeyPress={e => { if (e.key === 'Enter') { ppkTriggerSet(e.target.value, triggerUnit); } }}
                                />
                                <UnitSelector
                                    disabled={!rttRunning || externalTrigger}
                                    defaultSelected={1}
                                    units={['\u00B5A', 'mA']}
                                    id="input-dropdown-addon"
                                    onChange={i => { triggerUnitChangeAction(['uA', 'mA'][i]); }}
                                    as={InputGroup.Append}
                                    variant="light"
                                />
                            </InputGroup>
                            <Form.Group controlId="extTrigCheck">
                                <Form.Check
                                    type="checkbox"
                                    onChange={e => externalTriggerToggled(e.target.checked)}
                                    checked={externalTrigger}
                                    label="External trigger"
                                />
                            </Form.Group>
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>
            </Accordion>
            <Accordion defaultActiveKey="2">
                <Card>
                    <Card.Header>
                        <Accordion.Toggle as={Button} variant="link" eventKey="2">
                            Voltage Regulator
                        </Accordion.Toggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey="2">
                        <Card.Body>
                            VDD {voltageRegulatorVdd} mV
                            <Slider
                                min={1850}
                                max={3600}
                                value={voltageRegulatorVdd}
                                labels={{ 1850: '1850', 3600: '3600' }}
                                format={n => `${n}mV`}
                                onChange={moveVoltageRegulatorVddAction}
                                tooltip={false}
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
                                    min={38}
                                    max={175}
                                    value={switchUpSliderPosition}
                                    labels={{ 60: `${switchUpLow.toFixed(2)} uA`, 160: `${switchUpHigh.toFixed(2)} mA` }}
                                    format={n => `${n}mA`}
                                    tooltip={false}
                                    onChange={switchingPointUpMoved}
                                    onChangeComplete={ppkSwitchingPointsUpSet}
                                />
                                Switch down
                                <Slider
                                    min={100}
                                    max={400}
                                    reverse={false}
                                    value={switchDownSliderPosition}
                                    labels={{ 110: `${switchDownLow.toFixed(2)} uA`, 370: `${switchDownHigh.toFixed(2)} mA` }}
                                    format={n => `${n}mA`}
                                    tooltip={false}
                                    onChange={switchingPointDownMovedAction}
                                    onChangeComplete={ppkSwitchingPointsDownSet}
                                />
                                <Button
                                    onClick={ppkSwitchingPointsReset}
                                    variant="light"
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
    externalTrigger: PropTypes.bool.isRequired,
    spikeFiltering: PropTypes.bool.isRequired,

    deviceRunning: PropTypes.bool.isRequired,
    rttRunning: PropTypes.bool.isRequired,
    ppkToggleDUT: PropTypes.func.isRequired,

    triggerSingleWaiting: PropTypes.bool.isRequired,
    triggerRunning: PropTypes.bool.isRequired,
    ppkTriggerUpdateWindow: PropTypes.func.isRequired,
    ppkTriggerStart: PropTypes.func.isRequired,
    ppkTriggerStop: PropTypes.func.isRequired,
    triggerUnitChangeAction: PropTypes.func.isRequired,
    ppkTriggerSet: PropTypes.func.isRequired,
    ppkTriggerSingleSet: PropTypes.func.isRequired,
    triggerUnit: PropTypes.string.isRequired,
    triggerWindowLength: PropTypes.number.isRequired,
    moveTriggerWindowLengthAction: PropTypes.func.isRequired,

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

    externalTriggerToggled: PropTypes.func.isRequired,
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
