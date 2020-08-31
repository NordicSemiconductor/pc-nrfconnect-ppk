/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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
import { string } from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import Form from 'react-bootstrap/Form';
import { Slider } from 'pc-nrfconnect-shared';

import { updateSpikeFilter } from '../../actions/deviceActions';
import Collapse from './Collapse';

import { appState } from '../../reducers/appReducer';
import { updateSpikeFilterAction, spikeFilterState } from '../../reducers/spikeFilterReducer';

const SpikeFilter = ({ eventKey }) => {
    const dispatch = useDispatch();
    const {
        jumps,
        samples,
        alpha,
        alpha4,
    } = useSelector(spikeFilterState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }
    return (
        <Collapse title="SPIKE FILTER" eventKey={eventKey}>
            <Form.Label className="pt-2 d-flex flex-row justify-content-between">
                <span>Range jumps</span>
                <span>{jumps}</span>
            </Form.Label>
            <Slider
                id="slider-spike-jumps"
                values={[jumps]}
                range={{ min: 1, max: 4 }}
                onChange={[value => dispatch(updateSpikeFilterAction({ jumps: value }))]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label className="pt-2 d-flex flex-row justify-content-between">
                <span>Samples to smooth</span>
                <span>{samples}</span>
            </Form.Label>
            <Slider
                id="slider-spike-samples"
                values={[samples]}
                range={{ min: 1, max: 10 }}
                onChange={[value => dispatch(updateSpikeFilterAction({ samples: value }))]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label className="pt-2 d-flex flex-row justify-content-between">
                <span>Coefficient</span>
                <span>{alpha}</span>
            </Form.Label>
            <Slider
                id="slider-spike-alpha"
                values={[alpha]}
                range={{ min: 0, max: 0.5, decimals: 2 }}
                onChange={[value => dispatch(updateSpikeFilterAction({ alpha: value }))]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label className="pt-2 d-flex flex-row justify-content-between">
                <span>Coefficient for range 4</span>
                <span>{alpha4}</span>
            </Form.Label>
            <Slider
                id="slider-spike-alpha4"
                values={[alpha4]}
                range={{ min: 0, max: 0.5, decimals: 2 }}
                onChange={[value => dispatch(updateSpikeFilterAction({ alpha4: value }))]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
        </Collapse>
    );
};

SpikeFilter.propTypes = {
    eventKey: string.isRequired,
};

export default SpikeFilter;
