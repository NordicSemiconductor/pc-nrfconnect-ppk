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
import { useDispatch } from 'react-redux';
import { number } from 'prop-types';
import { setWindowOffsetAction } from '../../../reducers/triggerReducer';

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
        setWindowOffset(
            drag.triggerWindowOffset +
                (duration * (clientX - drag.clientX)) /
                    target.parentElement.offsetWidth
        );
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
