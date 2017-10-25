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

import { start } from '../actions/PPKActions';

const SidePanel = props => (
    <div className="core-side-panel">
        <ButtonGroup block vertical>
            <Button bsStyle="primary" bsSize="large" onClick={props.start}>
                <Glyphicon glyph="play" />
                Start Average
            </Button>
        </ButtonGroup>
        <ButtonGroup block vertical>
            <Button bsSize="large" onClick={props.toggleDeviceUnderTest}>
                <Glyphicon glyph={props.deviceUnderTest ? 'record' : 'remove-circle'} />
                Device Under Test
            </Button>
        </ButtonGroup>
        <Accordion defaultActiveKey="1">
            <Panel header="Trigger" eventKey="1" defaultExpanded>
                Window {props.triggerWindowLength} ms
                <Slider
                    min={1}
                    max={100}
                    value={props.triggerWindowLength}
                    labels={{ 1: '1', 100: '100' }}
                    format={n => `${n}ms`}
                    onChange={props.moveTriggerWindowLength}
                    tooltip={false}
                    onChangeComplete={() => { console.log('Trigger window to be set to', props.triggerWindowLength, 'ms'); }}
                />
                <ButtonGroup justified style={{ marginTop: 10 }}>
                    <Button bsSize="large" style={{ width: '50%' }}>
                        <Glyphicon glyph="time" />
                        Waiting...
                    </Button>
                    <Button bsSize="large" style={{ width: '50%' }}>
                        <Glyphicon glyph="flash" />
                        Start
                    </Button>
                </ButtonGroup>
                <InputGroup style={{ marginTop: 10 }}>
                    <InputGroup.Addon>Trigger level</InputGroup.Addon>
                    <FormControl type="text" />
                    <UnitSelector
                        defaultSelected={0}
                        units={['\u00B5A', 'mA']}
                        componentClass={InputGroup.Button}
                        id="input-dropdown-addon"
                        onChange={i => { console.log('Trigger level unit changed to:', ['\u00B5A', 'mA'][i]); }}
                    />
                </InputGroup>
                <Checkbox>external trigger</Checkbox>
                <Checkbox>trigger filter</Checkbox>
            </Panel>
            <Panel header="Voltage Regulator" eventKey="2">
                VDD {props.voltageRegulatorVdd} mV
                <Slider
                    min={1850}
                    max={3600}
                    value={props.voltageRegulatorVdd}
                    labels={{ 1850: '1850', 3600: '3600' }}
                    format={n => `${n}mV`}
                    onChange={props.moveVoltageRegulatorVdd}
                    tooltip={false}
                    onChangeComplete={() => { console.log('VDD to be set to', props.voltageRegulatorVdd, 'mV'); }}
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
                    onChangeComplete={() => { console.log('foo'); }}
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
                    <FormControl type="text" defaultValue="2500" />
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
                    <FormControl type="text" defaultValue="2500" />
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
                    <FormControl type="text" defaultValue="2500" />
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

    deviceUnderTest: PropTypes.bool.isRequired,
    toggleDeviceUnderTest: PropTypes.func.isRequired,

    triggerWindowLength: PropTypes.number.isRequired,
    moveTriggerWindowLength: PropTypes.func.isRequired,

    voltageRegulatorVdd: PropTypes.number.isRequired,
    moveVoltageRegulatorVdd: PropTypes.func.isRequired,
};

export default connect(
    state => ({
        deviceUnderTest: state.app.app.deviceUnderTest,
        triggerWindowLength: state.app.trigger.windowLength,
        voltageRegulatorVdd: state.app.voltageRegulator.vdd,
    }),
    dispatch => Object.assign(
        {},
        bindActionCreators({ start }, dispatch),
        {
            toggleDeviceUnderTest: () => dispatch({
                type: 'DEVICE_UNDER_TEST_TOGGLE',
            }),
            moveTriggerWindowLength: windowLength => dispatch({
                type: 'TRIGGER_WINDOW_LENGTH_MOVE',
                windowLength,
            }),
            moveVoltageRegulatorVdd: vdd => dispatch({
                type: 'VOLTAGE_REGULATOR_VDD_MOVE',
                vdd,
            }),
        },
    ),
)(SidePanel);
