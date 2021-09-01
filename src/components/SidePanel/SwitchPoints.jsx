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
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup, Slider, Toggle } from 'pc-nrfconnect-shared';

import {
    spikeFilteringToggle,
    switchingPointsDownSet,
    switchingPointsReset,
    switchingPointsUpSet,
} from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import {
    switchingPointDownMovedAction,
    switchingPointsState,
    switchingPointUpMoved,
} from '../../reducers/switchingPointsReducer';

const SwitchPoints = () => {
    const dispatch = useDispatch();

    const {
        spikeFiltering,
        switchUpHigh,
        switchUpLow,
        switchDownHigh,
        switchDownLow,
        switchUpSliderPosition,
        switchDownSliderPosition,
    } = useSelector(switchingPointsState);
    const { capabilities } = useSelector(appState);

    if (!capabilities.ppkSwitchPointUp) {
        return null;
    }

    return (
        <CollapsibleGroup heading="Switch levels">
            {capabilities.ppkSwitchPointUp && (
                <>
                    <span title="Set dynamic range switching levels. See user guide for details.">
                        Switch up
                    </span>
                    <Slider
                        title="Set dynamic range switching levels. See user guide for details."
                        values={[switchUpSliderPosition]}
                        range={{ min: 38, max: 175 }}
                        onChange={[val => dispatch(switchingPointUpMoved(val))]}
                        onChangeComplete={() =>
                            dispatch(switchingPointsUpSet())
                        }
                    />
                    <Row className="mb-3">
                        <Col>{`${switchUpLow.toFixed(2)} \u00B5A`}</Col>
                        <Col className="text-right">{`${switchUpHigh.toFixed(
                            2
                        )} mA`}</Col>
                    </Row>
                    Switch down
                    <Slider
                        values={[switchDownSliderPosition]}
                        range={{ min: 100, max: 400 }}
                        onChange={[
                            val => dispatch(switchingPointDownMovedAction(val)),
                        ]}
                        onChangeComplete={() =>
                            dispatch(switchingPointsDownSet())
                        }
                    />
                    <Row className="mb-2">
                        <Col>{`${switchDownLow.toFixed(2)} \u00B5A`}</Col>
                        <Col className="text-right">{`${switchDownHigh.toFixed(
                            2
                        )} mA`}</Col>
                    </Row>
                    <Button
                        onClick={() => dispatch(switchingPointsReset())}
                        variant="set"
                        className="w-50 mb-2"
                    >
                        Reset
                    </Button>
                </>
            )}
            {capabilities.ppkSpikeFilteringOn && (
                <Toggle
                    title="Removes excessive current spikes caused by measurement circuitry"
                    onToggle={() => dispatch(spikeFilteringToggle())}
                    isToggled={spikeFiltering}
                    label="Spike filtering"
                    variant="secondary"
                />
            )}
        </CollapsibleGroup>
    );
};

export default SwitchPoints;
