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

import React, { useEffect, useRef, useState } from 'react';
import { func, number, shape } from 'prop-types';

import './inline-input.scss';

const isInRange = (value, { min, max }) => {
    const valueAsNumber = Number(value);
    return valueAsNumber >= min && valueAsNumber <= max;
};

const useValidatedState = (initial, validator) => {
    const validatedState = value => ({ value, valid: validator(value) });

    const [value, setValue] = useState(validatedState(initial));

    return [
        value,
        newValue => setValue(validatedState(newValue)),
    ];
};

const useSynchronisationIfChangedFromOutside = (value, setInput) => {
    const ref = useRef(value);
    useEffect(() => {
        if (ref.current !== value) {
            setInput(value);
            ref.current = value;
        }
    });
    return ref.current;
};

const InlineInput = ({ value, range, onChange }) => {
    const [input, setInput] = useValidatedState(value, newValue => isInRange(newValue, range));
    useSynchronisationIfChangedFromOutside(value, setInput);

    const onChangeIfValid = event => {
        const newValue = event.target.value;
        setInput(newValue);
        if (isInRange(newValue, range)) {
            onChange(Number(newValue));
        }
    };

    return (
        <input
            type="text"
            className={`inline-input ${input.valid ? '' : 'invalid'}`}
            style={{ width: `${2 + Math.floor(Math.log10(range.max))}ex` }}
            value={input.value}
            onChange={onChangeIfValid}
        />
    );
};

InlineInput.propTypes = {
    value: number.isRequired,
    range: shape({
        min: number.isRequired,
        max: number.isRequired,
    }).isRequired,
    onChange: func.isRequired,
};

export default InlineInput;
