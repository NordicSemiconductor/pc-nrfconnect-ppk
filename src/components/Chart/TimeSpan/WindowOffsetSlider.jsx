/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { number } from 'prop-types';

import { setWindowOffsetAction } from '../../../slices/triggerSlice';

import './timespan.scss';

const windowOffsetHandleSvg = (
    <svg height={24} width={10}>
        <path d="M 0 24 C 0 25 1 26 2 26 L 9 26 C 10 26 11 25 11 24 L 11 11 C 11 7 5.5 0 5.5 0 C 5.5 0 0 7 0 11 z" />
    </svg>
);

const WindowOffsetSlider = ({ triggerWindowOffset, duration }) => {
    const dispatch = useDispatch();
    const setWindowOffset = useCallback(
        (...args) => dispatch(setWindowOffsetAction(...args)),
        [dispatch]
    );
    const [drag, setDrag] = useState(null);

    const onPointerDown = ({ clientX, pointerId, target }) => {
        target.setPointerCapture(pointerId);
        setDrag({ clientX, triggerWindowOffset });
    };
    const onPointerMove = ({ clientX, target }) => {
        if (!drag) return;
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
        setWindowOffset(offset);
    };

    const onPointerUp = ({ target, pointerId }) => {
        target.releasePointerCapture(pointerId);
        setDrag(null);
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

WindowOffsetSlider.propTypes = {
    triggerWindowOffset: number,
    duration: number,
};
