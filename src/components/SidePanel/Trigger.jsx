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

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import SelectableContext from 'react-bootstrap/SelectableContext';

import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';

import {
    triggerLengthUpdate,
    triggerStart,
    triggerStop,
    triggerSingleSet,
    externalTriggerToggled,
    updateTriggerLevel,
} from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import { triggerState } from '../../reducers/triggerReducer';
import { chartState, toggleTriggerHandle } from '../../reducers/chartReducer';

import Group from './Group';

import './inline-dropdown.scss';

const SINGLE = 'SINGLE';
const CONTINUOUS = 'CONTINUOUS';
const EXTERNAL = 'EXTERNAL';

const Trigger = () => {
    const dispatch = useDispatch();
    const { rttRunning, capabilities } = useSelector(appState);
    const {
        externalTrigger,
        triggerRunning,
        triggerLevel,
        triggerSingleWaiting,
    } = useSelector(triggerState);

    const { triggerHandleVisible } = useSelector(chartState);

    const range = {
        min: (450 * 13) / 1e3,
        max: (4000 * 13) / 1e3,
        decimals: 2,
    };

    const [level, setLevel] = useState(triggerLevel);
    // use true for mA, false for uA
    const [levelUnit, setLevelUnit] = useState(false);
    const [triggerLength, setTriggerLength] = useState(range.min);

    useEffect(() => {
        setLevelUnit(triggerLevel > 1000);
        setLevel(
            triggerLevel > 1000
                ? Number((triggerLevel / 1000).toFixed(3))
                : triggerLevel
        );
    }, [triggerLevel]);

    const sendTriggerLevel = unit => {
        dispatch(updateTriggerLevel(level * 1000 ** unit));
        setLevelUnit(unit);
    };

    const [triggerMode, setTriggerMode] = useState(CONTINUOUS);

    if (!capabilities.ppkTriggerSet) {
        return null;
    }

    let startLabel = 'External';
    let startTitle;
    let onStartClicked = null;
    if (!externalTrigger) {
        if (!(triggerRunning || triggerSingleWaiting)) {
            startLabel = 'Start trigger sampling​';
            startTitle =
                'Start sampling at 77kHz for a short duration when the set trigger level is reached';
            if (triggerMode === SINGLE) {
                onStartClicked = () => dispatch(triggerSingleSet());
            } else {
                onStartClicked = () => dispatch(triggerStart());
            }
        } else {
            onStartClicked = () => dispatch(triggerStop());
            if (triggerMode === SINGLE) {
                startLabel = 'Wait';
                startTitle = 'Waiting for samples above trigger level';
            } else {
                startLabel = 'Stop trigger sampling.';
            }
        }
    }

    const onTriggerToggled = enable => {
        if (triggerHandleVisible !== enable) {
            dispatch(toggleTriggerHandle());
        }
    };

    return (
        <Group
            heading="Trigger"
            collapse={{
                collapsible: true,
                onToggled: onTriggerToggled,
            }}
        >
            <ButtonGroup className="mb-2 w-100 trigger-mode d-flex flex-row">
                <Button
                    title="Sample once​"
                    disabled={!rttRunning || triggerMode === SINGLE}
                    variant={triggerMode === SINGLE ? 'set' : 'unset'}
                    onClick={() => {
                        setTriggerMode(SINGLE);
                        if (externalTrigger) {
                            dispatch(externalTriggerToggled(false));
                        }
                    }}
                >
                    Single
                </Button>
                <Button
                    title="Sample until stopped by user​"
                    disabled={!rttRunning || triggerMode === CONTINUOUS}
                    variant={triggerMode === CONTINUOUS ? 'set' : 'unset'}
                    onClick={() => {
                        setTriggerMode(CONTINUOUS);
                        if (externalTrigger) {
                            dispatch(externalTriggerToggled(false));
                        }
                    }}
                >
                    Continuous
                </Button>
                <Button
                    title="Sample controlled from TRIG IN​"
                    disabled={!rttRunning || triggerMode === EXTERNAL}
                    variant={triggerMode === EXTERNAL ? 'set' : 'unset'}
                    onClick={() => {
                        setTriggerMode(EXTERNAL);
                        dispatch(externalTriggerToggled(true));
                    }}
                >
                    External
                </Button>
            </ButtonGroup>
            <Button
                title={startTitle}
                className={`w-100 mb-2 ${
                    triggerRunning || triggerSingleWaiting ? 'active-anim' : ''
                }`}
                disabled={!rttRunning || externalTrigger}
                variant="set"
                onClick={onStartClicked}
            >
                {startLabel}
            </Button>
            <Form.Label
                title="Duration of trigger window"
                htmlFor="slider-trigger-window"
            >
                <span className="flex-fill">Length</span>
                <NumberInlineInput
                    value={triggerLength}
                    range={range}
                    onChange={value => setTriggerLength(value)}
                    onChangeComplete={() =>
                        dispatch(triggerLengthUpdate(triggerLength))
                    }
                    chars={6}
                />{' '}
                ms
            </Form.Label>
            <Slider
                title="Duration of trigger window"
                id="slider-trigger-window"
                values={[triggerLength]}
                range={range}
                onChange={[value => setTriggerLength(value)]}
                onChangeComplete={() =>
                    dispatch(triggerLengthUpdate(triggerLength))
                }
            />
            <div
                title="Rising edge level to run trigger​"
                className={externalTrigger ? 'disabled' : ''}
            >
                <Form.Label
                    htmlFor="slider-trigger-level"
                    className="d-flex flex-row align-items-baseline"
                >
                    <span className="flex-fill">Level</span>
                    <NumberInlineInput
                        value={level}
                        range={{
                            min: 0,
                            max: levelUnit ? 1000 : 1000000,
                            decimals: levelUnit ? 3 : 0,
                        }}
                        onChange={value => setLevel(value)}
                        onChangeComplete={() => sendTriggerLevel(levelUnit)}
                        chars={8}
                    />
                    {/* The context in the next line is a hack to work around
                        a bug in react-bootstrap described in
                        https://github.com/react-bootstrap/react-bootstrap/issues/4176#issuecomment-549999503

                        When we are certain that this app is only run with by
                        a launcher that provides a version of
                        react-bootstrap >= 1.4 this hack can be removed.

                        The bug that this hack fixes is that selecting a value in the
                        dropdown also closes the collapsible trigger group around it.
                        */}
                    <SelectableContext.Provider value={false}>
                        <Dropdown className="inline-dropdown">
                            <Dropdown.Toggle
                                id="dropdown-current-unit"
                                variant="plain"
                            >
                                {levelUnit ? 'mA' : '\u00B5A'}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item
                                    eventKey="1"
                                    onSelect={() => sendTriggerLevel(false)}
                                >
                                    {'\u00B5A'}
                                </Dropdown.Item>
                                <Dropdown.Item
                                    eventKey="2"
                                    onSelect={() => sendTriggerLevel(true)}
                                >
                                    mA
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </SelectableContext.Provider>
                </Form.Label>
            </div>
        </Group>
    );
};

export default Trigger;
