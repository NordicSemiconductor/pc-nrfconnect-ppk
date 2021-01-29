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
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup } from 'pc-nrfconnect-shared';

import { updateSpikeFilter } from '../../actions/deviceActions';
import { Slider } from '../../from_pc-nrfconnect-shared';
import { appState } from '../../reducers/appReducer';
import {
    resetSpikeFilterToDefaults,
    spikeFilterState,
    updateSpikeFilterAction,
} from '../../reducers/spikeFilterReducer';

const SpikeFilter = () => {
    const dispatch = useDispatch();
    const { samples, alpha, alpha5 } = useSelector(spikeFilterState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }
    return (
        <CollapsibleGroup
            heading="Spike filter"
            title="Adjust how the software filters current spikes"
        >
            <Form.Label
                title="Number of samples after a dynamic range switch to apply filter"
                className="pt-2 d-flex flex-row justify-content-between"
            >
                <span>Samples to smooth</span>
                <span>{samples}</span>
            </Form.Label>
            <Slider
                id="slider-spike-samples"
                title="Number of samples after a dynamic range switch to apply filter"
                values={[samples]}
                range={{ min: 1, max: 10 }}
                onChange={[
                    value =>
                        dispatch(updateSpikeFilterAction({ samples: value })),
                ]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label
                title="Higher values filter more aggressively"
                className="pt-2 d-flex flex-row justify-content-between"
            >
                <span>Coefficient for range 1-4</span>
                <span>{alpha}</span>
            </Form.Label>
            <Slider
                id="slider-spike-alpha"
                title="Higher values filter more aggressively"
                values={[alpha]}
                range={{ min: 0, max: 0.5, decimals: 2 }}
                onChange={[
                    value =>
                        dispatch(updateSpikeFilterAction({ alpha: value })),
                ]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label
                title="Higher values filter more aggressively"
                className="pt-2 d-flex flex-row justify-content-between"
            >
                <span>Coefficient for range 5</span>
                <span>{alpha5}</span>
            </Form.Label>
            <Slider
                id="slider-spike-alpha5"
                title="Higher values filter more aggressively"
                values={[alpha5]}
                range={{ min: 0, max: 0.5, decimals: 2 }}
                onChange={[
                    value =>
                        dispatch(updateSpikeFilterAction({ alpha5: value })),
                ]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Button
                onClick={() => {
                    dispatch(resetSpikeFilterToDefaults());
                    dispatch(updateSpikeFilter());
                }}
                variant="set"
                className="w-50 mb-2 mt-3"
            >
                Defaults
            </Button>
        </CollapsibleGroup>
    );
};

export default SpikeFilter;
