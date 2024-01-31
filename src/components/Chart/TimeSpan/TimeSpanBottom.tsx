/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    indexToTimestamp,
    normalizeTimeCeil,
    normalizeTimeFloor,
} from '../../../globals';
import {
    chartCursorAction,
    getChartXAxisRange,
} from '../../../slices/chartSlice';
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

interface TimeSpanBottom {
    cursorBegin?: null | number;
    cursorEnd?: null | number;
    width: number;
}

interface Drag {
    clientX: number;
    cursorBegin: number;
    cursorEnd: number;
}

const TimeSpanBottom = ({
    cursorBegin = null,
    cursorEnd = null,
    width,
}: TimeSpanBottom) => {
    const dispatch = useDispatch();
    const chartCursor = useCallback(
        (begin, end) =>
            dispatch(chartCursorAction({ cursorBegin: begin, cursorEnd: end })),
        [dispatch]
    );

    const [drag, setDrag] = useState<Drag | null>(null);
    const { windowBegin, windowDuration } = useSelector(getChartXAxisRange);

    const showHandles = cursorBegin !== null && cursorEnd !== null;

    const onPointerDown = ({
        clientX,
        pointerId,
        target,
    }: {
        clientX: number;
        pointerId: number;
        target: null | EventTarget;
    }) => {
        if (
            target instanceof Element &&
            cursorBegin != null &&
            cursorEnd != null
        ) {
            target.setPointerCapture(pointerId);
            setDrag({ clientX, cursorBegin, cursorEnd });
        }
    };
    const onPointerUp = ({
        target,
        pointerId,
    }: {
        target: null | EventTarget;
        pointerId: number;
    }) => {
        if (target instanceof Element) {
            target.releasePointerCapture(pointerId);
            setDrag(null);
        }
    };

    const timeDelta =
        cursorBegin != null && cursorEnd != null
            ? Math.abs(
                  normalizeTimeFloor(cursorEnd) -
                      normalizeTimeCeil(cursorBegin) +
                      indexToTimestamp(1)
              )
            : windowDuration;
    return (
        <div className="timespan selection" style={{ width }}>
            {showHandles && (
                <div
                    className="cursor begin"
                    style={{
                        left: `${
                            (100 * (cursorBegin - windowBegin)) / windowDuration
                        }%`,
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={({ clientX, target }) => {
                        if (
                            drag &&
                            target instanceof HTMLElement &&
                            target.parentElement
                        ) {
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
                begin={cursorBegin != null ? cursorBegin - windowBegin : null}
                end={cursorEnd != null ? cursorEnd - windowBegin : null}
                totalDuration={windowDuration}
            />
            {showHandles && (
                <div
                    className="cursor end"
                    style={{
                        left: `${
                            (100 * (cursorEnd - windowBegin)) / windowDuration
                        }%`,
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={({ clientX, target }) => {
                        if (
                            drag &&
                            target instanceof Element &&
                            target.parentElement
                        ) {
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

export default TimeSpanBottom;
