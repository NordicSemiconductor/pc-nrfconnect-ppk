/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

const toString = (value, unit, value2 = null, unit2 = null) =>
    value2 === null ? `${value}${unit}` : `${value}${unit} ${value2}${unit2}`;

const toHTML = (value, unit, value2 = null, unit2 = null) => (
    <div className="value">
        {value}
        <span className="unit">{unit}</span>
        {value2 !== null && (
            <>
                {' '}
                {value2}
                <span className="unit">{unit2}</span>
            </>
        )}
    </div>
);

const format = (microseconds, formatter) => {
    if (Number.isNaN(microseconds)) return null;
    const usec = Math.floor(microseconds);
    const u = `${usec % 1000}`;

    if (usec < 1000) return formatter(u, '\u00B5s');
    const t = new Date(Math.floor(usec / 1000));
    const z = `${t.getUTCMilliseconds()}`;

    if (usec < 10000) return formatter(`${z}.${u.padStart(3, '0')}`, 'ms');
    if (usec < 100000)
        return formatter(`${z}.${u.padStart(3, '0').substr(0, 2)}`, 'ms');
    if (usec < 1000000)
        return formatter(`${z}.${u.padStart(3, '0').substr(0, 1)}`, 'ms');

    const s = `${t.getUTCSeconds()}`;
    if (usec < 10000000) return formatter(`${s}.${z.padStart(3, '0')}`, 's');
    if (usec < 60000000)
        return formatter(`${s}.${z.padStart(3, '0').substr(0, 2)}`, 's');

    const m = `${t.getUTCMinutes()}`;
    if (usec < 600000000)
        return formatter(
            `${m}:${s.padStart(2, '0')}.${z.padStart(3, '0').substr(0, 1)}`,
            'm'
        );
    if (usec < 3600000000) return formatter(`${m}:${s.padStart(2, '0')}`, 'm');

    const h = `${t.getUTCHours()}`;
    if (usec < 86400000000)
        return formatter(
            `${h}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`,
            'h'
        );

    const d = Math.floor(usec / 86400000000);
    return formatter(d, 'd', `${h}:${m.padStart(2, '0')}`, 'h');
};

export const formatDuration = microseconds => format(microseconds, toString);
export const formatDurationHTML = microseconds => format(microseconds, toHTML);
