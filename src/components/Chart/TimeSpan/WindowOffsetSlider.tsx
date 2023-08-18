/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    setWindowOffsetAction,
    triggerState,
} from '../../../slices/triggerSlice';

import './timespan.scss';

const windowOffsetHandleSvg = (
    <svg height={24} width={10}>
        <path d="M 0 24 C 0 25 1 26 2 26 L 9 26 C 10 26 11 25 11 24 L 11 11 C 11 7 5.5 0 5.5 0 C 5.5 0 0 7 0 11 z" />
    </svg>
);

interface Drag {
    clientX: number;
    triggerWindowOffset: number;
}

const WindowOffsetSlider = ({ duration }: { duration: number }) => {
    const dispatch = useDispatch();
    const { triggerWindowOffset } = useSelector(triggerState);

    const [drag, setDrag] = useState<Drag | null>(null);

    const onPointerDown = ({
        clientX,
        pointerId,
        target,
    }: {
        clientX: number;
        pointerId: number;
        target: EventTarget;
    }) => {
        if (target instanceof Element) {
            target.setPointerCapture(pointerId);
            setDrag({ clientX, triggerWindowOffset });
        }
    };

    const onPointerMove = ({
        clientX,
        target,
    }: {
        clientX: number;
        target: EventTarget;
    }) => {
        if (drag && target instanceof Element && target.parentElement) {
            let offset =
                drag.triggerWindowOffset +
                (duration * (clientX - drag.clientX)) /
                    target.parentElement.offsetWidth;
            // prevent dragging handle out of bounds
            const span = duration / 2;
            if (offset > span) {
                offset = span;
            } else if (offset < -span) {
                offset = -span;
            }
            dispatch(setWindowOffsetAction(offset));
        }
    };

    const onPointerUp = ({
        target,
        pointerId,
    }: {
        target: EventTarget;
        pointerId: number;
    }) => {
        if (target instanceof Element) {
            target.releasePointerCapture(pointerId);
            setDrag(null);
        }
    };

    const handlePosition = triggerWindowOffset
        ? 100 * ((triggerWindowOffset + duration) / duration - 0.5)
        : 50;

    return (
        <div
            className="cursor begin triggerOffset"
            style={{
                left: `${handlePosition}%`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            data-testid="offsetHandler"
            title="Slide handle right or left to shift window placement"
        >
            {windowOffsetHandleSvg}
        </div>
    );
};

export default WindowOffsetSlider;
