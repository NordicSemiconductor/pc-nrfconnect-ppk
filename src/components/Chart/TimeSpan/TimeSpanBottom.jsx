/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { number } from 'prop-types';

import { options } from '../../../globals';
import { chartCursorAction, chartState } from '../../../slices/chartSlice';
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
        (...args) => dispatch(chartCursorAction({ ...args })),
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
    const timeDelta =
        cursorBegin && cursorEnd
            ? Math.abs(cursorEnd - cursorBegin)
            : windowDuration;
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
            <TimeSpanLabel
                duration={timeDelta}
                begin={cursorBegin ? cursorBegin - w0 : null}
                end={cursorEnd ? cursorEnd - w0 : null}
                totalDuration={windowDuration}
            />
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
