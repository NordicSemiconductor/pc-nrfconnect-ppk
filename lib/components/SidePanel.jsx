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

import UnitSelector from '../components/UnitSelector';

import {
    ADC_SAMPLING_TIME_US,
} from '../constants';

const SidePanel = props => {
    const {
        bindHotkey,
        toggleAdvancedModeAction,
        advancedMode,
        rttRunning,
    } = props;

    bindHotkey('alt+ctrl+shift+a', toggleAdvancedModeAction);

    return (
        <div className={`core-side-panel${props.hidden ? ' hidden' : ''}${rttRunning ? '' : ' disabled'}`}>
            <ButtonGroup block vertical>
                <Button
                    bsStyle="primary"
                    bsSize="large"
                    disabled={!rttRunning}
                    onClick={props.averageRunning ? props.averageStop : props.averageStart}
                >
                    <Glyphicon glyph={props.averageRunning ? 'stop' : 'play'} />
                    {props.averageRunning ? 'Stop' : 'Start'}
                </Button>
            </ButtonGroup>
            <ButtonGroup block vertical>
                <Button
                    style={{ backgroundColor: 0xFF11AA }}
                    bsSize="large"
                    disabled={!rttRunning}
                    onClick={() => props.ppkToggleDUT(props.deviceRunning)}
                >
                    <Glyphicon glyph={props.deviceRunning ? 'remove-circle' : 'record'} />
                    {props.deviceRunning ? 'Power OFF' : 'Power ON'}
                </Button>
            </ButtonGroup>
            <Accordion defaultActiveKey="1">
                <Panel header="Trigger" eventKey="1" /* defaultExpanded */>
                    Window {props.triggerWindowLength} ms
                    <Slider
                        disabled={!rttRunning}
                        min={(450 * ADC_SAMPLING_TIME_US) / 1e3}
                        max={(4000 * ADC_SAMPLING_TIME_US) / 1e3}
                        value={props.triggerWindowLength}
                        labels={{ 1: '5.85', 100: '52' }}
                        format={n => `${n}ms`}
                        onChange={props.moveTriggerWindowLengthAction}
                        tooltip={false}
                        onChangeComplete={
                            () => props.ppkTriggerUpdateWindow(props.triggerWindowLength)
                        }
                    />
                    <ButtonGroup justified style={{ marginTop: 10 }}>
                        <Button
                            disabled={!rttRunning || props.externalTrigger}
                            bsSize="large"
                            style={{ width: '50%' }}
                            onClick={props.triggerSingleWaiting ?
                                props.ppkTriggerToggle : props.ppkTriggerSingleSet}
                        >
                            <Glyphicon glyph="time" />
                            {props.triggerSingleWaiting ? 'Waiting...' : 'Single'}
                        </Button>
                        <Button
                            disabled={!rttRunning || props.externalTrigger}
                            bsSize="large"
                            style={{ width: '50%' }}
                            onClick={props.ppkTriggerToggle}
                        >
                            <Glyphicon glyph={props.triggerRunning ? 'flash' : 'record'} />
                            {props.triggerRunning ? 'Stop' : 'Start'}
                        </Button>
                    </ButtonGroup>
                    <InputGroup style={{ marginTop: 10 }}>
                        <InputGroup.Addon>Trigger level</InputGroup.Addon>
                        <FormControl
                            disabled={!rttRunning || props.externalTrigger}
                            placeholder="1"
                            type="text"
                            onKeyPress={e => { if (e.key === 'Enter') { props.ppkTriggerSet(e.target.value, props.triggerUnit); } }}
                        />
                        <UnitSelector
                            disabled={!rttRunning || props.externalTrigger}
                            defaultSelected={1}
                            units={['\u00B5A', 'mA']}
                            componentClass={InputGroup.Button}
                            id="input-dropdown-addon"
                            onChange={i => { props.triggerUnitChangeAction(['uA', 'mA'][i]); }}
                        />
                    </InputGroup>
                    <Checkbox
                        onClick={e => props.externalTriggerToggled(e.target.checked)}
                        checked={props.externalTrigger}
                    >
                        External trigger
                    </Checkbox>
                </Panel>
            </Accordion>
            <Accordion>
                <Panel header="Voltage Regulator" eventKey="2" defaultExpanded>
                    VDD {props.voltageRegulatorVdd} mV
                    <Slider
                        min={1850}
                        max={3600}
                        value={props.voltageRegulatorVdd}
                        labels={{ 1850: '1850', 3600: '3600' }}
                        format={n => `${n}mV`}
                        onChange={props.moveVoltageRegulatorVddAction}
                        tooltip={false}
                        onChangeComplete={props.ppkUpdateRegulator}
                    />
                </Panel>
                { advancedMode &&
                    <Panel header="Switching Groups" eventKey="3">
                        Switch up
                        <Slider
                            min={38}
                            max={175}
                            value={props.switchUpSliderPosition}
                            labels={{ 60: `${props.switchUpLow.toFixed(2)} uA`, 160: `${props.switchUpHigh.toFixed(2)} mA` }}
                            format={n => `${n}mA`}
                            tooltip={false}
                            onChange={props.switchingPointUpMoved}
                            onChangeComplete={props.ppkSwitchingPointsUpSet}
                        />
                        Switch down
                        <Slider
                            min={100}
                            max={400}
                            reverse={false}
                            value={props.switchDownSliderPosition}
                            labels={{ 110: `${props.switchDownLow.toFixed(2)} uA`, 370: `${props.switchDownHigh.toFixed(2)} mA` }}
                            format={n => `${n}mA`}
                            tooltip={false}
                            onChange={props.switchingPointDownMovedAction}
                            onChangeComplete={props.ppkSwitchingPointsDownSet}
                        />
                        <Button
                            onClick={props.ppkSwitchingPointsReset}
                        >
                            Reset switching points
                        </Button>
                        <Checkbox
                            onChange={props.spikeFilteringToggle}
                            checked={props.spikeFiltering}
                        >
                            Spike filtering
                        </Checkbox>
                    </Panel>
                }
                {advancedMode &&
                <Panel header="Resistor Calibration" eventKey="4">
                    <InputGroup>
                        <InputGroup.Addon>High</InputGroup.Addon>
                        <FormControl
                            type="text"
                            value={props.resistorHigh}
                            onChange={e => props.updateHighResistorAction(e.target.value)}
                            onKeyPress={e => { if (e.key === 'Enter') { props.updateResistors(); } }}
                        />
                    </InputGroup>
                    <InputGroup>
                        <InputGroup.Addon>Mid</InputGroup.Addon>
                        <FormControl
                            type="text"
                            value={props.resistorMid}
                            onChange={e => props.updateMidResistorAction(e.target.value)}
                            onKeyPress={e => { if (e.key === 'Enter') { props.updateResistors(); } }}
                        />
                    </InputGroup>
                    <InputGroup>
                        <InputGroup.Addon>Low</InputGroup.Addon>
                        <FormControl
                            type="text"
                            value={props.resistorLow}
                            onChange={e => props.updateLowResistorAction(e.target.value)}
                            onKeyPress={e => { if (e.key === 'Enter') { props.updateResistors(); } }}
                        />
                    </InputGroup>
                    <ButtonGroup justified style={{ marginTop: 10 }}>
                        <Button style={{ width: '50%' }} onClick={props.updateResistors}>
                            <Glyphicon glyph="refresh" />Update
                        </Button>
                        <Button
                            style={{ width: '50%' }}
                            onClick={props.resetResistors}
                        ><Glyphicon glyph="ban-circle" />Reset</Button>
                    </ButtonGroup>
                </Panel>
                }
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
    ppkTriggerToggle: PropTypes.func.isRequired,
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
