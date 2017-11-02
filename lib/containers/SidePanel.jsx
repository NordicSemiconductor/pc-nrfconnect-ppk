/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
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
import { Accordion, Button, ButtonGroup, Checkbox, FormControl, Glyphicon, InputGroup, Panel } from 'react-bootstrap';

import Slider from 'react-rangeslider';
import 'react-rangeslider/lib/index.css';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import UnitSelector from '../components/UnitSelector';

import {
    start,
    ppkUpdateRegulator,
    ppkTriggerUpdateWindow,
    ppkTriggerToggle,
    ppkTriggerSet,
    ppkTriggerSingleSet,
    ppkToggleDUT,
} from '../actions/PPKActions';

const SidePanel = props => (
    <div className="core-side-panel">
        <ButtonGroup block vertical>
            <Button bsStyle="primary" bsSize="large" onClick={props.start}>
                <Glyphicon glyph="play" />
                Start Average
            </Button>
        </ButtonGroup>
        <ButtonGroup block vertical>
            <Button bsSize="large" onClick={() => props.ppkToggleDUT(props.deviceRunning)}>
                <Glyphicon glyph={props.deviceRunning ? 'record' : 'remove-circle'} />
                Device Under Test
            </Button>
        </ButtonGroup>
        <Accordion defaultActiveKey="1">
            <Panel header="Trigger" eventKey="1" /* defaultExpanded */>
                Window {props.triggerWindowLength} ms
                <Slider
                    min={(300 * 18) / 1e3}   // 300 bytes * sampling interval = 5.4 ms
                    max={(6000 * 18) / 1e3} // 6000 bytes * sampling interval = 108 ms
                    value={props.triggerWindowLength}
                    labels={{ 1: '5.4', 100: '108' }}
                    format={n => `${n}ms`}
                    onChange={props.moveTriggerWindowLength}
                    tooltip={false}
                    onChangeComplete={() => props.ppkTriggerUpdateWindow(props.triggerWindowLength)}
                />
                <ButtonGroup justified style={{ marginTop: 10 }}>
                    <Button bsSize="large" style={{ width: '50%' }} onClick={props.ppkTriggerSingleSet}>
                        <Glyphicon glyph="time" />
                        {props.triggerSingleWaiting ? 'Waiting..' : 'Single'}
                    </Button>
                    <Button bsSize="large" style={{ width: '50%' }} onClick={props.ppkTriggerToggle}>
                        <Glyphicon glyph={props.triggerRunning ? 'flash' : 'record'} />
                        {props.triggerRunning ? 'Stop' : 'Start'}
                    </Button>
                </ButtonGroup>
                <InputGroup style={{ marginTop: 10 }}>
                    <InputGroup.Addon>Trigger level</InputGroup.Addon>
                    <FormControl
                        placeholder="3"
                        type="text"
                        onKeyPress={e => { if (e.key === 'Enter') { props.ppkTriggerSet(e.target.value, props.triggerUnit); } }}
                    />
                    <UnitSelector
                        defaultSelected={1}
                        units={['\u00B5A', 'mA']}
                        componentClass={InputGroup.Button}
                        id="input-dropdown-addon"
                        onChange={i => { props.triggerUnitChanged(['uA', 'mA'][i]); }}
                    />
                </InputGroup>
                <Checkbox>external trigger</Checkbox>
                <Checkbox>trigger filter</Checkbox>
            </Panel>
            <Panel header="Voltage Regulator" eventKey="2" defaultExpanded>
                VDD {props.voltageRegulatorVdd} mV
                <Slider
                    min={1850}
                    max={3600}
                    value={props.voltageRegulatorVdd}
                    labels={{ 1850: '1850', 3600: '3600' }}
                    format={n => `${n}mV`}
                    onChange={props.moveVoltageRegulatorVdd}
                    tooltip={false}
                    onChangeComplete={() => props.ppkUpdateRegulator(props.voltageRegulatorVdd)}
                />
            </Panel>
            <Panel header="Switching Groups" eventKey="3">
                Switch up
                <Slider
                    min={1}
                    max={100}
                    value={50}
                    labels={{ 1: '1', 100: '100' }}
                    format={n => `${n}mA`}
                    tooltip={false}
                    onChangeComplete={() => { console.log(props.triggerUnit); }}
                />
                Switch down
                <Slider
                    min={1}
                    max={100}
                    value={50}
                    labels={{ 1: '1', 100: '100' }}
                    format={n => `${n}mA`}
                    tooltip={false}
                    onChangeComplete={() => { console.log('foo'); }}
                />
                <Button block>Reset switching points</Button>
            </Panel>
            <Panel header="Resistor Calibration" eventKey="4">
                <InputGroup>
                    <InputGroup.Addon>High</InputGroup.Addon>
                    <FormControl type="text" defaultValue="1.8" />
                    <UnitSelector
                        defaultSelected={0}
                        units={['\u00B5A', 'mA']}
                        componentClass={InputGroup.Button}
                        id="input-dropdown-addon"
                        onChange={i => { console.log('High SP unit changed to:', ['\u00B5A', 'mA'][i]); }}
                    />
                </InputGroup>
                <InputGroup>
                    <InputGroup.Addon>Mid</InputGroup.Addon>
                    <FormControl type="text" defaultValue="29.0" />
                    <UnitSelector
                        defaultSelected={0}
                        units={['\u00B5A', 'mA']}
                        componentClass={InputGroup.Button}
                        id="input-dropdown-addon"
                        onChange={i => { console.log('Mid SP unit changed to:', ['\u00B5A', 'mA'][i]); }}
                    />
                </InputGroup>
                <InputGroup>
                    <InputGroup.Addon>Low</InputGroup.Addon>
                    <FormControl type="text" defaultValue="490.0" />
                    <UnitSelector
                        defaultSelected={0}
                        units={['\u00B5A', 'mA']}
                        componentClass={InputGroup.Button}
                        id="input-dropdown-addon"
                        onChange={i => { console.log('Low SP unit changed to:', ['\u00B5A', 'mA'][i]); }}
                    />
                </InputGroup>
                <ButtonGroup justified style={{ marginTop: 10 }}>
                    <Button style={{ width: '50%' }}><Glyphicon glyph="refresh" />Update</Button>
                    <Button style={{ width: '50%' }}><Glyphicon glyph="ban-circle" />Reset</Button>
                </ButtonGroup>
            </Panel>
        </Accordion>
    </div>
);

SidePanel.propTypes = {
    start: PropTypes.func.isRequired,
    ppkUpdateRegulator: PropTypes.func.isRequired,

    deviceRunning: PropTypes.bool.isRequired,
    triggerRunning: PropTypes.bool.isRequired,
    triggerSingleWaiting: PropTypes.bool.isRequired,
    ppkToggleDUT: PropTypes.func.isRequired,

    ppkTriggerUpdateWindow: PropTypes.func.isRequired,
    ppkTriggerToggle: PropTypes.func.isRequired,

    triggerUnitChanged: PropTypes.func.isRequired,
    ppkTriggerSet: PropTypes.func.isRequired,
    ppkTriggerSingleSet: PropTypes.func.isRequired,
    triggerUnit: PropTypes.string.isRequired,


    triggerWindowLength: PropTypes.number.isRequired,
    moveTriggerWindowLength: PropTypes.func.isRequired,

    voltageRegulatorVdd: PropTypes.number.isRequired,
    moveVoltageRegulatorVdd: PropTypes.func.isRequired,
};

export default connect(
    state => ({
        deviceRunning: state.app.app.deviceRunning,
        triggerRunning: state.app.app.triggerRunning,
        triggerSingleWaiting: state.app.trigger.triggerSingleWaiting,
        triggerWindowLength: state.app.trigger.windowLength,
        triggerUnit: state.app.trigger.triggerUnit,
        voltageRegulatorVdd: state.app.voltageRegulator.vdd,
    }),
    dispatch => Object.assign(
        {},
        bindActionCreators({
            start,
            ppkUpdateRegulator,
            ppkTriggerUpdateWindow,
            ppkTriggerToggle,
            ppkTriggerSet,
            ppkTriggerSingleSet,
            ppkToggleDUT,
        }, dispatch),
        {
            triggerUnitChanged: triggerUnit => dispatch({
                type: 'TRIGGER_WINDOW_UNIT_CHANGE',
                triggerUnit,
            }),
            moveTriggerWindowLength: windowLength => dispatch({
                type: 'TRIGGER_WINDOW_LENGTH_MOVE',
                windowLength,
            }),
            moveVoltageRegulatorVdd: vdd => {
                dispatch({
                    type: 'VOLTAGE_REGULATOR_VDD_MOVE',
                    vdd,
                });
            },
        },
    ),
)(SidePanel);
