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
import { useSelector, useDispatch } from 'react-redux';
import { chartState, chartWindowAction } from '../reducers/chartReducer';

import { options } from '../globals';

import './BufferView.scss';

export default () => {
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

    const width = 100;
    const f = width / totalInUs;

    return (
        <div className="buffer-view progress-bar-striped">
            <div className="buffer-remaining" style={{ width: `${bufferRemaining * f}%` }} />
            <div
                className="window"
                style={{ left: `${bufferRemaining * f}%`, width: `${windowDuration * f}%` }}
                onPointerDown={e => {
                    if (e.button === 0) {
                        e.target.setPointerCapture(e.pointerId);
                        setX({ pageX: e.pageX, offsetLeft: e.target.offsetLeft });
                    }
                }}
                onPointerMove={e => {
                    if (x !== null) {
                        let left = Math.max(0, x.offsetLeft + e.pageX - x.pageX);
                        left = Math.min(left,
                            e.target.parentNode.clientWidth - e.target.clientWidth);
                        e.target.style.left = `${left}px`;
                    }
                }}
                onPointerUp={e => {
                    delete e.target.style.left;
                    e.target.releasePointerCapture(e.pointerId);
                    setX(null);
                    chartMove(totalInUs * (e.pageX - x.pageX) / e.target.parentNode.clientWidth);
                }}
            />

            <span>
                {bufferRemaining > 0
                    ? `${Number((bufferRemaining / 1e6)).toFixed(1)} s`
                    : 'FULL'}
            </span>
        </div>
    );
};
