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
import { string, instanceOf, number } from 'prop-types';
import { unit, Unit } from 'mathjs';

import './statbox.scss';

const Value = ({ label, u }) => {
    const v = u.format({ notation: 'fixed', precision: 2 });
    const [valStr, unitStr] = v.split(' ');
    return (
        <div className="value-box">
            <div className="value">
                {valStr}
                <span className="unit">{unitStr.replace('u', '\u00B5')}</span>
            </div>
            {label}
        </div>
    );
};
Value.propTypes = {
    label: string.isRequired,
    u: instanceOf(Unit).isRequired,
};

const time = delta => {
    let ret = unit(delta, 'us');
    if (delta > 60 * 1e6) {
        ret = ret.to('min');
    }
    return ret;
};

const StatBox = ({
    average = null, max = null, delta = null, label,
}) => (
    <div className="statbox d-flex flex-column">
        <div className="d-flex flex-row flex-fill mb-1">
            {delta === null && (
                <div className="value-box">
                    SELECT RANGE IN CHART
                </div>
            )}
            {delta !== null && (
                <>
                    <Value label="average" u={unit(average, 'uA')} />
                    <Value label="max" u={unit(max || 0, 'uA')} />
                    <Value label="time" u={time(delta)} />
                    <Value label="charge" u={unit(average * ((delta || 1) / 1e6), 'uC')} />
                </>
            )}
        </div>
        {label}
    </div>
);

StatBox.propTypes = {
    average: number,
    max: number,
    delta: number,
    label: string.isRequired,
};

export default StatBox;
