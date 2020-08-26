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

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import { NumberInlineInput, Slider, Toggle } from 'pc-nrfconnect-shared';

import Collapse from './Collapse';
import UnitSelector from './UnitSelector';

import {
    triggerUpdateWindow,
    triggerStart,
    triggerStop,
    triggerSet,
    triggerSingleSet,
    externalTriggerToggled,
} from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import { triggerState } from '../../reducers/triggerReducer';

export default () => {
    const dispatch = useDispatch();
    const { rttRunning, capabilities } = useSelector(appState);
    const {
        externalTrigger,
        triggerRunning,
        triggerSingleWaiting,
    } = useSelector(triggerState);

    if (!capabilities.ppkTriggerSet) {
        return null;
    }

    const range = {
        min: (450 * 13) / 1e3,
        max: (4000 * 13) / 1e3,
    };

    const [level, setLevel] = useState({ value: 1, unit: 1000 });
    const [triggerWindowLength, setTriggerWindowLength] = useState(range.min);

    const sendTriggerLevel = () => {
        dispatch(triggerSet(level.value * level.unit));
    };

    return (
        <Accordion defaultActiveKey="0">
            <Collapse title="TRIGGER" eventKey="0">
                <Form.Label htmlFor="slider-trigger-window">
                    Window{' '}
                    <NumberInlineInput
                        value={triggerWindowLength}
                        range={range}
                        onChange={value => setTriggerWindowLength(value)}
                    />
                    {' '}ms
                </Form.Label>
                <Slider
                    id="slider-trigger-window"
                    values={[triggerWindowLength]}
                    range={range}
                    onChange={[value => setTriggerWindowLength(value)]}
                    onChangeComplete={() => dispatch(triggerUpdateWindow(triggerWindowLength))}
                />
                <div className="d-flex flex-column">
                    <ButtonGroup style={{ marginTop: 10 }}>
                        <Button
                            disabled={!rttRunning || externalTrigger}
                            size="lg"
                            variant="light"
                            style={{ width: '50%' }}
                            onClick={() => dispatch(
                                triggerSingleWaiting
                                    ? triggerStop()
                                    : triggerSingleSet(),
                            )}
                        >
                            <span className="mdi mdi-clock-outline" />
                            {triggerSingleWaiting ? 'Waiting...' : 'Single'}
                        </Button>
                        <Button
                            disabled={!rttRunning || externalTrigger}
                            size="lg"
                            variant="light"
                            style={{ width: '50%' }}
                            onClick={() => dispatch(
                                triggerRunning
                                    ? triggerStop()
                                    : triggerStart(),
                            )}
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
                        value={level.value}
                        type="number"
                        onChange={e => setLevel({
                            ...level, value: parseInt(e.target.value, 10),
                        })}
                        onKeyPress={e => {
                            if (e.key === 'Enter') {
                                sendTriggerLevel();
                            }
                        }}
                    />
                    <UnitSelector
                        disabled={!rttRunning || externalTrigger}
                        units={['\u00B5A', 'mA']}
                        initial={1}
                        id="input-dropdown-addon"
                        onChange={i => setLevel({ ...level, unit: 1000 ** i })}
                        as={InputGroup.Append}
                        variant="light"
                    />
                </InputGroup>
                <Toggle
                    onToggle={e => dispatch(externalTriggerToggled(e.target.checked))}
                    isToggled={externalTrigger}
                    label="External trigger"
                    variant="secondary"
                />
            </Collapse>
        </Accordion>
    );
};
