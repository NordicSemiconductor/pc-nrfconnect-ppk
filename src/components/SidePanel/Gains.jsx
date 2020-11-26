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
import { useDispatch, useSelector } from 'react-redux';

import Form from 'react-bootstrap/Form';
import { CollapsibleGroup } from 'pc-nrfconnect-shared';
import { Slider } from '../../from_pc-nrfconnect-shared';

import { updateGains } from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import { updateGainsAction, gainsState } from '../../reducers/gainsReducer';

const gainTitles = [
    '~100nA - 50µA',
    '~50µA - 500µA',
    '~500µA - 5mA',
    '~5mA - 60mA',
    '~60mA - 1A',
];

const Gains = () => {
    const dispatch = useDispatch();
    const gains = useSelector(gainsState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }

    const range = { min: 90, max: 110 };
    return (
        <CollapsibleGroup
            heading="Gains"
            title="Adjust gains to correct potential measurement errors"
        >
            {gains.map((gain, index) => (
                <React.Fragment key={`${index + 1}`}>
                    <Form.Label
                        title={gainTitles[index]}
                        className="pt-2 d-flex flex-row justify-content-between"
                    >
                        <span>Range {index + 1}</span>
                        <span>{(gain / 100).toFixed(2)}</span>
                    </Form.Label>
                    <Slider
                        id={`slider-gains-${index}`}
                        title={gainTitles[index]}
                        values={[gain]}
                        range={range}
                        onChange={[
                            value => dispatch(updateGainsAction(value, index)),
                        ]}
                        onChangeComplete={() => dispatch(updateGains(index))}
                    />
                </React.Fragment>
            ))}
        </CollapsibleGroup>
    );
};

export default Gains;
