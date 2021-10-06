/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
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
