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

import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';
import { bool, func, number, shape, string } from 'prop-types';

const NumberWithUnit = ({
    title = '',
    className = '',
    label,
    unit,
    multiplier,
    range,
    value,
    onChange,
    onChangeComplete,
    disabled = false,
    slider = false,
    ...props
}) => {
    const [internalValue, setInternalValue] = useState(value / multiplier);

    const change = n => {
        setInternalValue(n);
        onChange(n * multiplier);
    };

    useEffect(() => setInternalValue(value / multiplier), [multiplier, value]);

    return (
        <div
            title={title}
            className={`${className} ${disabled ? 'disabled' : ''}`}
        >
            <Form.Label className="d-flex flex-row align-items-baseline">
                <span>{label}&nbsp;</span>
                <NumberInlineInput
                    value={internalValue}
                    range={range}
                    onChange={change}
                    onChangeComplete={onChangeComplete}
                    disabled={disabled}
                    {...props}
                />
                <span>&nbsp;{unit}</span>
            </Form.Label>
            {slider && (
                <Slider
                    values={[internalValue]}
                    range={range}
                    onChange={[change]}
                    onChangeComplete={onChangeComplete}
                    disabled={disabled}
                />
            )}
        </div>
    );
};

NumberWithUnit.propTypes = {
    title: string,
    className: string,
    label: string.isRequired,
    value: number.isRequired,
    unit: string.isRequired,
    multiplier: number.isRequired,
    range: shape({
        min: number.isRequired,
        max: number.isRequired,
        decimals: number,
    }).isRequired,
    onChange: func.isRequired,
    onChangeComplete: func.isRequired,
    disabled: bool,
    slider: bool,
};

export default NumberWithUnit;
