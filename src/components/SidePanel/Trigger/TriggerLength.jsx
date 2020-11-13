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
import Form from 'react-bootstrap/Form';

import { useDispatch, useSelector } from 'react-redux';
import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';
import { triggerLengthUpdate } from '../../../actions/deviceActions';
import { triggerState } from '../../../reducers/triggerReducer';

const TriggerLength = () => {
    const dispatch = useDispatch();
    const { triggerWindowRange, triggerLength } = useSelector(triggerState);
    const range = { ...triggerWindowRange, decimals: 2 };

    const [triggerLen, setTriggerLen] = useState(triggerLength);

    return (
        <>
            <Form.Label
                title="Duration of trigger window"
                htmlFor="slider-trigger-window"
            >
                <span className="flex-fill">Length</span>
                <NumberInlineInput
                    value={triggerLen}
                    range={range}
                    onChange={setTriggerLen}
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
        </>
    );
};

export default TriggerLength;
