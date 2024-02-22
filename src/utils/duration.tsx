/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- conservative refactoring, TODO: remove this line */

import React, { ReactElement } from 'react';

import { TimeUnit } from './persistentStore';

const toString = (
    value: any,
    unit: any,
    value2: any = null,
    unit2: any = null
): string =>
    value2 === null ? `${value}${unit}` : `${value}${unit} ${value2}${unit2}`;

const toHTML = (
    value: any,
    unit: any,
    value2: any = null,
    unit2: any = null
): ReactElement<any, any> => (
    <div className="value">
        {value}
        <span className="tw-text-xs">{unit}</span>
        {value2 !== null && (
            <>
                {' '}
                {value2}
                <span className="tw-text-xs">{unit2}</span>
            </>
        )}
    </div>
);

const format = (
    microseconds: number,
    formatter: any
): ReactElement<any, any> | string | null => {
    if (Number.isNaN(microseconds)) return null;
    const usec = Math.trunc(microseconds);
    const u = `${usec % 1000}`;

    if (usec < 1000) return formatter(u, '\u00B5s');
    const t = new Date(Math.trunc(usec / 1000));
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

    const d = Math.trunc(usec / 86400000000);
    return formatter(d, 'd', `${h}:${m.padStart(2, '0')}`, 'h');
};

export const formatDuration = (microseconds: number) =>
    format(microseconds, toString);
export const formatDurationHTML = (microseconds: number) =>
    format(microseconds, toHTML);

export const convertTimeToSeconds = (time: number, timeUnit: TimeUnit) => {
    switch (timeUnit) {
        case 's':
            return time;
        case 'm':
            return time * 60;
        case 'h':
            return time * 60 * 60;
        case 'd':
            return time * 24 * 60 * 60;
        case 'inf':
            return Infinity;
    }
};
