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

import React, { useState } from 'react';
import { number } from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { chartState, chartWindowAction } from '../../reducers/chartReducer';

import { options } from '../../globals';

import './bufferview.scss';

const BufferView = ({ width }) => {
    const {
        windowBegin,
        windowEnd,
        windowDuration,
        bufferLength,
        bufferRemaining,
    } = useSelector(chartState);

    const totalInUs = bufferLength + windowDuration;

    const dispatch = useDispatch();
    const chartMove = diff => {
        const { timestamp } = options;
        let d = Math.min(diff, timestamp - windowEnd);
        d = Math.max(d, timestamp - totalInUs - windowBegin);
        dispatch(chartWindowAction(windowBegin + d, windowEnd + d, windowDuration, null, null));
    };

    const [x, setX] = useState(null);
    const f = 100 / totalInUs;

    return (
        <div className="buffer-view" style={{ width }}>
            <div className="mid-line" />
            <div
                className="window"
                style={{
                    width: `${windowDuration * f}%`,
                    left: `${bufferRemaining * f}%`,
                }}
                onPointerDown={e => {
                    if (e.button === 0) {
                        e.target.setPointerCapture(e.pointerId);
                        setX(e.clientX);
                    }
                }}
                onPointerMove={e => {
                    if (x !== null) {
                        chartMove((totalInUs * (e.clientX - x)) / e.target.parentNode.clientWidth);
                        setX(e.clientX);
                    }
                }}
                onPointerUp={e => {
                    e.target.releasePointerCapture(e.pointerId);
                    setX(null);
                }}
            />
        </div>
    );
};

BufferView.propTypes = {
    width: number.isRequired,
};

export default BufferView;
