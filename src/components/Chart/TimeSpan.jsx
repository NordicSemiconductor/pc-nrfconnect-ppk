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
import { number } from 'prop-types';
import { useSelector } from 'react-redux';
import { unit } from 'mathjs';
import { chartState } from '../../reducers/chartReducer';

import './timespan.scss';

const TimeSpan = ({ cursorBegin = null, cursorEnd = null, width }) => {
    const { windowBegin, windowEnd, windowDuration } = useSelector(chartState);
    const [w0, w1] = (windowBegin === 0 && windowEnd === 0)
        ? [-windowDuration, 0]
        : [windowBegin, windowEnd];
    const duration = (cursorBegin === null) ? windowDuration : (cursorEnd - cursorBegin);

    let time = unit(duration, 'us');
    if (duration > 60 * 1e6) {
        time = time.to('min');
    }
    const v = time.format({ notation: 'fixed', precision: 2 });
    const [valStr, unitStr] = v.split(' ');

    const showHandles = cursorBegin !== null && w0 !== 0;

    const [begin, end] = cursorBegin === null
        ? [w0, w1]
        : [cursorBegin, cursorEnd];
    return (
        <div className="timespan" style={{ width }}>
            {showHandles && (
                <div
                    className="cursor begin"
                    style={{ left: `${(100 * (cursorBegin - w0)) / windowDuration}%` }}
                />
            )}
            <div
                className="span"
                style={{
                    left: `${(100 * (begin - w0)) / windowDuration}%`,
                    width: `${(100 * (end - begin)) / windowDuration}%`,
                }}
            >
                <div className="value">
                    {`\u0394${valStr}${unitStr.replace('u', '\u00B5')}`}
                </div>
            </div>
            {showHandles && (
                <div
                    className="cursor end"
                    style={{ left: `${(100 * (cursorEnd - w0)) / windowDuration}%` }}
                />
            )}
        </div>
    );
};

TimeSpan.propTypes = {
    cursorBegin: number,
    cursorEnd: number,
    width: number.isRequired,
};

export default TimeSpan;
