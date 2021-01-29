/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
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
import { bool, func, string } from 'prop-types';

import classNames from '../utils/classNames';

import './inline-input.scss';

/*
This input component is a bit tricky, because it has several constraints:

We want to be able validate the input and indicate to the user whether the current input is
invalid.

Users should be able to enter invalid values, we just want to indicate that they are invalid
and do not use the value unless it is valid. We want to allow users to enter momentarily
invalid values, because forbidding them to do so would be a pain. E.g. if we have a range from
100 to 1000, then entering the number 500 would be hard if the system forbids to just type '5'
because it is below 10).

To accomplish the above we need not just one, but two values: An internal value, which is what
is displayed to the user, can be potentially invalid, and is held in a state local to this
component. Only when this internal value is valid, then onChange is called, which should update
the external value, which is passed in as a prop.

We want to enable other controls to also update the external value and then have it reflect in
this input, so the external value and the internal value need to be synchronised, but the
external value must only overwrite the internal value if the former was changed.
useSynchronisationIfChangedFromOutside does take care of this by remembering the previous
external value and comparing with it to determine whether it has changed.
*/

const useSynchronisationIfChangedFromOutside = (
    externalValue,
    setInternalValue
) => {
    const previousExternalValue = useRef(externalValue);
    useEffect(() => {
        if (previousExternalValue.current !== externalValue) {
            setInternalValue(externalValue);
            previousExternalValue.current = externalValue;
        }
    });
    return previousExternalValue.current;
};

const InlineInput = React.forwardRef(
    (
        {
            disabled = false,
            value: externalValue,
            isValid = () => true,
            onChange,
            onChangeComplete = () => {},
            className = '',
        },
        ref
    ) => {
        const [internalValue, setInternalValue] = useState(externalValue);
        useSynchronisationIfChangedFromOutside(externalValue, setInternalValue);

        const onChangeIfValid = event => {
            if (disabled) {
                return;
            }

            const newValue = event.target.value;
            setInternalValue(newValue);
            if (isValid(newValue)) {
                onChange(newValue);
            }
        };

        const resetToExternalValueOrOnChangeCompleteIfValid = () => {
            if (disabled) {
                return;
            }

            if (isValid(internalValue)) {
                onChangeComplete(internalValue);
            } else {
                setInternalValue(externalValue);
            }
        };

        const onChangeCompleteIfValid = event => {
            if (disabled) {
                return;
            }

            event.stopPropagation();

            if (event.key === 'Enter' && isValid(internalValue)) {
                onChangeComplete(internalValue);
            }
        };

        const stopPropagation = event => event.stopPropagation();

        return (
            <input
                ref={ref}
                type="text"
                className={classNames(
                    'inline-input',
                    isValid(internalValue) || 'invalid',
                    disabled && 'disabled',
                    className
                )}
                size={internalValue.length + 2}
                disabled={disabled}
                value={internalValue}
                onChange={onChangeIfValid}
                onBlur={resetToExternalValueOrOnChangeCompleteIfValid}
                onKeyUp={onChangeCompleteIfValid}
                onClick={stopPropagation}
            />
        );
    }
);

InlineInput.propTypes = {
    disabled: bool,
    value: string.isRequired,
    isValid: func,
    onChange: func.isRequired,
    onChangeComplete: func,
    className: string,
};

export default InlineInput;
