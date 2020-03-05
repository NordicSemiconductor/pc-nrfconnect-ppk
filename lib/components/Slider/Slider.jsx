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
import {
    arrayOf, func, number, string,
} from 'prop-types';

import Bar from './Bar';
import Handle from './Handle';
import useWidthObserver from './useWidthObserver';
import rangeShape from './rangeShape';

import './slider.scss';

const Slider = ({
    id, values, range, onChange, onChangeComplete,
}) => {
    if (values.length === 0) console.error('"values" must contain at least on element');
    if (values.length !== onChange.length) console.error(`Props 'values' and 'onChange' must have the same size but were ${values} and ${onChange}`);
    if (range.min > range.max) console.error(`range.min must not be higher than range.max: ${JSON.stringify(range)}`);

    const [sliderWidth, sliderRef] = useWidthObserver();

    return (
        <div className="slider" id={id} ref={sliderRef}>
            <Bar values={values} range={range} />
            {values.map((value, index) => (
                <Handle
                    key={index} // eslint-disable-line react/no-array-index-key
                    value={value}
                    range={range}
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
    values: arrayOf(number.isRequired).isRequired,
    range: rangeShape.isRequired,
    onChange: arrayOf(func.isRequired).isRequired,
    onChangeComplete: func,
};
Slider.defaultProps = {
    id: null,
    onChangeComplete: () => {},
};

export default Slider;
