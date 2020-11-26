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
import { exact, func, number, string } from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';
import { CollapsibleGroup } from '../../from_pc-nrfconnect-shared';

import { updateResistors, resetResistors } from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import {
    updateHighResistorAction,
    updateMidResistorAction,
    updateLowResistorAction,
    resistorCalibrationState,
} from '../../reducers/resistorCalibrationReducer';

const ResistorSlider = ({ id, label, value, range, actionOnChange, chars }) => {
    const dispatch = useDispatch();

    return (
        <>
            <Form.Label htmlFor={id}>
                <span className="flex-fill">{label}</span>
                <NumberInlineInput
                    value={value}
                    range={range}
                    onChange={newValue => dispatch(actionOnChange(newValue))}
                    onChangeComplete={() => dispatch(updateResistors())}
                    chars={chars}
                />
                <span className="mdi mdi-omega" />
            </Form.Label>
            <Slider
                id={id}
                values={[value]}
                range={range}
                onChange={[newValue => dispatch(actionOnChange(newValue))]}
                onChangeComplete={() => dispatch(updateResistors())}
            />
        </>
    );
};
ResistorSlider.propTypes = {
    id: string.isRequired,
    label: string.isRequired,
    value: number.isRequired,
    range: exact({
        min: number.isRequired,
        max: number.isRequired,
        decimals: number,
    }).isRequired,
    actionOnChange: func.isRequired,
    chars: number.isRequired,
};

const ResistorCalibration = () => {
    const dispatch = useDispatch();
    const { userResLo, userResMid, userResHi } = useSelector(
        resistorCalibrationState
    );
    const { capabilities } = useSelector(appState);

    if (!capabilities.ppkUpdateResistors) {
        return null;
    }

    return (
        <CollapsibleGroup
            heading="Resistor calibration"
            title="Fine tune resistor values of the measurement paths. See user guide for details."
        >
            <ResistorSlider
                id="slider-res-hi"
                label="High"
                value={userResHi}
                range={{ min: 1, max: 3, decimals: 3 }}
                actionOnChange={updateHighResistorAction}
                chars={6}
            />
            <ResistorSlider
                id="slider-res-mid"
                label="Mid"
                value={userResMid}
                range={{ min: 25, max: 35, decimals: 1 }}
                actionOnChange={updateMidResistorAction}
                chars={6}
            />
            <ResistorSlider
                id="slider-res-low"
                label="Low"
                value={userResLo}
                range={{ min: 450, max: 550 }}
                actionOnChange={updateLowResistorAction}
                chars={5}
            />
            <ButtonGroup className="mt-2 w-100">
                <Button
                    onClick={() => dispatch(updateResistors())}
                    variant="set"
                >
                    Update
                </Button>
                <Button
                    onClick={() => dispatch(resetResistors())}
                    variant="set"
                >
                    Reset
                </Button>
            </ButtonGroup>
        </CollapsibleGroup>
    );
};

export default ResistorCalibration;
