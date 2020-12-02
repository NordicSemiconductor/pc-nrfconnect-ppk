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

import React from 'react';
import { arrayOf, bool, func, number, string } from 'prop-types';
import classNames from '../utils/classNames';

import Bar from './Bar';
import Handle from './Handle';
import useWidthObserver from './useWidthObserver';
import rangeShape from './rangeShape';
import { toPercentage } from './percentage';
import Ticks from './Ticks';

import './slider.scss';

const Slider = ({
    id,
    title,
    disabled = false,
    values,
    range,
    ticks,
    onChange,
    onChangeComplete,
}) => {
    if (values.length === 0)
        console.error('"values" must contain at least on element');
    if (values.length !== onChange.length)
        console.error(
            `Props 'values' and 'onChange' must have the same size but were ${values} and ${onChange}`
        );
    if (range.min > range.max)
        console.error(
            `range.min must not be higher than range.max: ${JSON.stringify(
                range
            )}`
        );

    const [sliderWidth, sliderRef] = useWidthObserver();

    const valueRange = {
        min: values.length === 1 ? range.min : Math.min(...values),
        max: Math.max(...values),
    };

    return (
        <div
            className={classNames('slider', disabled && 'disabled')}
            id={id}
            title={title}
            ref={sliderRef}
        >
            <Bar
                start={toPercentage(valueRange.min, range)}
                end={toPercentage(valueRange.max, range)}
            />
            {ticks && <Ticks valueRange={valueRange} range={range} />}
            {values.map((value, index) => (
                <Handle
                    key={index} // eslint-disable-line react/no-array-index-key
                    value={value}
                    range={range}
                    disabled={disabled}
                    onChange={onChange[index]}
                    onChangeComplete={onChangeComplete}
                    sliderWidth={sliderWidth}
                />
            ))}
        </div>
    );
};

Slider.propTypes = {
    id: string,
    title: string,
    disabled: bool,
    values: arrayOf(number.isRequired).isRequired,
    range: rangeShape.isRequired,
    ticks: bool,
    onChange: arrayOf(func.isRequired).isRequired,
    onChangeComplete: func,
};

export default Slider;
