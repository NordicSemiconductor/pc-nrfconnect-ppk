/* Copyright (c) 2015 - 2021, Nordic Semiconductor ASA
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

export const formatDuration = microseconds => {
    const usec = Math.floor(microseconds);
    const u = `${usec % 1000}`;

    if (usec < 1000) return `${u}\u00B5s`;

    const t = new Date(Math.floor(usec / 1000));
    const z = `${t.getUTCMilliseconds()}`;
    if (usec < 10000) return `${z}.${u.padStart(3, '0')}ms`;
    if (usec < 100000) return `${z}.${u.padStart(3, '0').substr(0, 2)}ms`;
    if (usec < 1000000) return `${z}.${u.padStart(3, '0').substr(0, 1)}ms`;

    const s = `${t.getUTCSeconds()}`;
    if (usec < 10000000) return `${s}.${z.padStart(3, '0')}s`;
    if (usec < 60000000) return `${s}.${z.padStart(3, '0').substr(0, 2)}s`;

    const m = `${t.getUTCMinutes()}`;
    if (usec < 600000000)
        return `${m}:${s.padStart(2, '0')}.${z.padStart(3, '0').substr(0, 1)}m`;
    if (usec < 3600000000) return `${m}:${s.padStart(2, '0')}m`;

    const h = `${t.getUTCHours()}`;
    if (usec < 86400000000)
        return `${h}:${m.padStart(2, '0')}:${s.padStart(2, '0')}h`;

    const d = Math.floor(usec / 86400000000);
    return `${d}d ${h.padStart(2, '0')}:${m.padStart(2, '0')}h`;
};

export const formatDurationHTML = microseconds => {
    if (Number.isNaN(microseconds)) return null;
    const usec = Math.floor(microseconds);
    const u = `${usec % 1000}`;

    if (usec < 1000)
        return (
            <div className="value">
                {u}
                <span className="unit">{'\u00B5s'}</span>
            </div>
        );
    const t = new Date(Math.floor(usec / 1000));
    const z = `${t.getUTCMilliseconds()}`;

    if (usec < 10000)
        return (
            <div className="value">
                {`${z}.${u.padStart(3, '0')}`}
                <span className="unit">ms</span>
            </div>
        );
    if (usec < 100000)
        return (
            <div className="value">
                {`${z}.${u.padStart(3, '0').substr(0, 2)}`}
                <span className="unit">ms</span>
            </div>
        );
    if (usec < 1000000)
        return (
            <div className="value">
                {`${z}.${u.padStart(3, '0').substr(0, 1)}`}
                <span className="unit">ms</span>
            </div>
        );

    const s = `${t.getUTCSeconds()}`;
    if (usec < 10000000)
        return (
            <div className="value">
                {`${s}.${z.padStart(3, '0')}`}
                <span className="unit">s</span>
            </div>
        );
    if (usec < 60000000)
        return (
            <div className="value">
                {`${s}.${z.padStart(3, '0').substr(0, 2)}`}
                <span className="unit">s</span>
            </div>
        );

    const m = `${t.getUTCMinutes()}`;
    if (usec < 600000000)
        return (
            <div className="value">
                {`${m}:${s.padStart(2, '0')}.${z
                    .padStart(3, '0')
                    .substr(0, 1)}`}
                <span className="unit">m</span>
            </div>
        );
    if (usec < 3600000000)
        return (
            <div className="value">
                {`${m}:${s.padStart(2, '0')}`}
                <span className="unit">m</span>
            </div>
        );

    const h = `${t.getUTCHours()}`;
    if (usec < 86400000000)
        return (
            <div className="value">
                {`${h}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`}
                <span className="unit">h</span>
            </div>
        );

    const d = Math.floor(usec / 86400000000);
    return (
        <div className="value">
            {d}
            <span className="unit">d</span>
            {` ${h.padStart(2, '0')}:${m.padStart(2, '0')}`}
            <span className="unit">h</span>
        </div>
    );
};
