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
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Collapse from './Collapse';

import {
    updateResistors,
    resetResistors,
} from '../../actions/deviceActions';

import {
    updateHighResistorAction,
    updateMidResistorAction,
    updateLowResistorAction,
    resistorCalibrationState,
} from '../../reducers/resistorCalibrationReducer';

export default () => {
    const dispatch = useDispatch();
    const { userResLo, userResMid, userResHi } = useSelector(resistorCalibrationState);

    const isHiValid = !Number.isNaN(parseFloat(userResHi));
    const isMidValid = !Number.isNaN(parseFloat(userResMid));
    const isLoValid = !Number.isNaN(parseFloat(userResLo));

    return (
        <Collapse title="RESISTOR CALIBRATION" eventKey="3">
            <InputGroup>
                <InputGroup.Prepend>
                    <InputGroup.Text>High</InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control
                    type="text"
                    value={userResHi}
                    isValid={isHiValid}
                    onChange={e => dispatch(updateHighResistorAction(e.target.value))}
                    onKeyPress={e => (
                        (e.key === 'Enter' && isHiValid) && dispatch(updateResistors())
                    )}
                />
            </InputGroup>
            <InputGroup>
                <InputGroup.Prepend>
                    <InputGroup.Text>Mid</InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control
                    type="text"
                    value={userResMid}
                    isValid={isMidValid}
                    onChange={e => dispatch(updateMidResistorAction(e.target.value))}
                    onKeyPress={e => (
                        (e.key === 'Enter' && isMidValid) && dispatch(updateResistors())
                    )}
                />
            </InputGroup>
            <InputGroup>
                <InputGroup.Prepend>
                    <InputGroup.Text>Low</InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control
                    type="text"
                    value={userResLo}
                    isValid={isLoValid}
                    onChange={e => dispatch(updateLowResistorAction(e.target.value))}
                    onKeyPress={e => (
                        (e.key === 'Enter' && isLoValid) && dispatch(updateResistors())
                    )}
                />
            </InputGroup>
            <div className="d-flex flex-column">
                <ButtonGroup style={{ marginTop: 10 }}>
                    <Button
                        disabled={!(isLoValid && isHiValid && isMidValid)}
                        onClick={() => dispatch(updateResistors())}
                        variant="light"
                    >
                        Update
                    </Button>
                    <Button
                        onClick={() => dispatch(resetResistors())}
                        variant="light"
                    >
                        Reset
                    </Button>
                </ButtonGroup>
            </div>
        </Collapse>
    );
};
