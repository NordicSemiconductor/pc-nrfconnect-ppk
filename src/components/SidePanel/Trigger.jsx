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
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';

import {
    triggerLengthUpdate,
    triggerStart,
    triggerStop,
    triggerSingleSet,
} from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import { triggerState } from '../../reducers/triggerReducer';
import { options } from '../../globals';
import TriggerModeGroup from './Trigger/TriggerModeGroup';
import TriggerLevel from './Trigger/TriggerLevel';

import Group from './Group';

import './inline-dropdown.scss';

const SINGLE = 'SINGLE';
const CONTINUOUS = 'CONTINUOUS';

const Trigger = () => {
    const dispatch = useDispatch();
    const { rttRunning, capabilities } = useSelector(appState);
    const {
        externalTrigger,
        triggerRunning,
        triggerLevel,
        triggerSingleWaiting,
        triggerWindowRange,
        triggerLength,
    } = useSelector(triggerState);

    const range = { ...triggerWindowRange, decimals: 2 };

    const [triggerLen, setTriggerLen] = useState(triggerLength);

    const [triggerMode, setTriggerMode] = useState(CONTINUOUS);

    let startLabel = 'External';
    let startTitle;
    let onStartClicked = null;
    if (!externalTrigger) {
        if (!(triggerRunning || triggerSingleWaiting)) {
            startLabel = 'Start';
            startTitle = `Start sampling at ${Math.round(
                options.samplesPerSecond / 1000
            )}kHz for a short duration when the set trigger level is reached`;
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
                startLabel = 'Stop';
            }
        }
    }

    return (
        <Group heading="Trigger">
            <Form.Label
                title="Duration of trigger window"
                htmlFor="slider-trigger-window"
            >
                <span className="flex-fill">Length</span>
                <NumberInlineInput
                    value={triggerLen}
                    range={range}
                    onChange={value => setTriggerLen(value)}
                    onChangeComplete={() =>
                        dispatch(triggerLengthUpdate(triggerLen))
                    }
                    chars={6}
                />{' '}
                ms
            </Form.Label>
            <Slider
                title="Duration of trigger window"
                id="slider-trigger-window"
                values={[triggerLen]}
                range={range}
                onChange={[value => setTriggerLen(value)]}
                onChangeComplete={() =>
                    dispatch(triggerLengthUpdate(triggerLen))
                }
            />
            <TriggerLevel
                triggerLevel={triggerLevel}
                externalTrigger={externalTrigger}
            />
            <TriggerModeGroup
                triggerMode={triggerMode}
                setTriggerMode={setTriggerMode}
                hasExternal={!!capabilities.ppkTriggerExtToggle}
                externalTrigger={externalTrigger}
                rttRunning={rttRunning}
            />
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
        </Group>
    );
};

export default Trigger;
