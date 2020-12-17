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

import React, { useState, useCallback } from 'react';
import { number } from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { chartState, chartCursorAction } from '../../../reducers/chartReducer';

import { options } from '../../../globals';
import TimeSpanLabel from './TimeSpanLabel';

import './timespan.scss';

const handleSvg = (
    <g>
        <path d="M 0 24 C 0 25 1 26 2 26 L 9 26 C 10 26 11 25 11 24 L 11 11 C 11 7 5.5 0 5.5 0 C 5.5 0 0 7 0 11 z" />
        <line x1="3" y1="22" x2="8" y2="22" />
        <line x1="3" y1="18" x2="8" y2="18" />
        <line x1="3" y1="14" x2="8" y2="14" />
    </g>
);

const TimeSpanBottom = ({ cursorBegin = null, cursorEnd = null, width }) => {
    const dispatch = useDispatch();
    const chartCursor = useCallback(
        (...args) => dispatch(chartCursorAction(...args)),
        [dispatch]
    );

    const [drag, setDrag] = useState(null);
    const { windowBegin, windowEnd, windowDuration } = useSelector(chartState);

    const w1 = windowEnd || options.timestamp - options.samplingTime;
    const w0 = windowBegin || w1 - windowDuration;

    const showHandles = cursorBegin !== null && w0 !== 0;

    const onPointerDown = ({ clientX, pointerId, target }) => {
        target.setPointerCapture(pointerId);
        setDrag({ clientX, cursorBegin, cursorEnd });
    };
    const onPointerUp = ({ target, pointerId }) => {
        target.releasePointerCapture(pointerId);
        setDrag(null);
    };
    return (
        <div className="timespan selection" style={{ width }}>
            {showHandles && (
                <div
                    className="cursor begin"
                    style={{
                        left: `${(100 * (cursorBegin - w0)) / windowDuration}%`,
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={({ clientX, target }) => {
                        if (drag) {
                            chartCursor(
                                drag.cursorBegin +
                                    windowDuration *
                                        ((clientX - drag.clientX) /
                                            target.parentElement.offsetWidth),
                                cursorEnd
                            );
                        }
                    }}
                    onPointerUp={onPointerUp}
                >
                    <svg height={26} width={11}>
                        {handleSvg}
                    </svg>
                </div>
            )}
            <TimeSpanLabel duration={windowDuration} />
            {showHandles && (
                <div
                    className="cursor end"
                    style={{
                        left: `${(100 * (cursorEnd - w0)) / windowDuration}%`,
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={({ clientX, target }) => {
                        if (drag) {
                            chartCursor(
                                cursorBegin,
                                drag.cursorEnd +
                                    windowDuration *
                                        ((clientX - drag.clientX) /
                                            target.parentElement.offsetWidth)
                            );
                        }
                    }}
                    onPointerUp={onPointerUp}
                >
                    <svg height={26} width={11}>
                        {handleSvg}
                    </svg>
                </div>
            )}
        </div>
    );
};

TimeSpanBottom.propTypes = {
    cursorBegin: number,
    cursorEnd: number,
    width: number.isRequired,
};

export default TimeSpanBottom;
