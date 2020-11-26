/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
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

import React, { useRef, useState } from 'react';
import { bool, func, number } from 'prop-types';
import classNames from '../utils/classNames';

import rangeShape from './rangeShape';
import {
    constrainedToPercentage,
    fromPercentage,
    toPercentage,
} from './percentage';

import './handle.scss';

const useAutoupdatingRef = value => {
    const ref = useRef(value);
    if (ref.current !== value) ref.current = value;
    return ref;
};

const noop = () => {};
const Handle = ({
    value,
    disabled,
    range,
    onChange,
    onChangeComplete = noop,
    sliderWidth,
}) => {
    const [currentlyDragged, setCurrentlyDragged] = useState(false);
    const percentage = toPercentage(value, range);

    const onMouseDragStart = useRef();

    // We have to put the callbacks into refs, so that we do not call outdated references later
    const onChangeRef = useAutoupdatingRef(onChange);
    const onChangeCompleteRef = useAutoupdatingRef(onChangeComplete);

    const grabHandle = event => {
        const sliderWidthStillUnknown = sliderWidth == null;
        if (sliderWidthStillUnknown) return;

        const mousePosition = event.clientX;
        onMouseDragStart.current = { mousePosition, percentage };
        setCurrentlyDragged(true);

        window.addEventListener('mousemove', dragHandle); // eslint-disable-line no-use-before-define
        window.addEventListener('mouseup', releaseHandle); // eslint-disable-line no-use-before-define
    };

    const dragHandle = event => {
        const oldMousePosition = onMouseDragStart.current.mousePosition;
        const newMousePosition = event.clientX;
        const percentageChange =
            ((oldMousePosition - newMousePosition) * 100) / sliderWidth;

        const oldPercentage = onMouseDragStart.current.percentage;
        const newPercentage = constrainedToPercentage(
            oldPercentage - percentageChange
        );

        onChangeRef.current(fromPercentage(newPercentage, range));
    };

    const releaseHandle = () => {
        window.removeEventListener('mousemove', dragHandle);
        window.removeEventListener('mouseup', releaseHandle);
        setCurrentlyDragged(false);
        onChangeCompleteRef.current();
    };

    return (
        <div
            className={classNames('handle', currentlyDragged && 'dragged')}
            style={{ left: `${percentage}%` }}
            onMouseDown={disabled ? noop : grabHandle}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
        />
    );
};
Handle.propTypes = {
    value: number.isRequired,
    disabled: bool.isRequired,
    range: rangeShape.isRequired,
    onChange: func.isRequired,
    onChangeComplete: func,
    sliderWidth: number,
};

export default Handle;
