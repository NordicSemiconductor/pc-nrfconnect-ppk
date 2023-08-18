/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { formatDuration } from '../../../utils/duration';

interface TimeSpanLabel {
    begin?: number | null;
    end?: number | null;
    duration: number;
    totalDuration?: number;
}

const TimeSpanLabel = ({
    duration,
    begin,
    end,
    totalDuration = duration,
}: TimeSpanLabel) => {
    const [nBegin, nEnd] =
        (begin ?? 0) > (end ?? 0) ? [end, begin] : [begin, end];

    const start = nBegin != null ? (100 * nBegin) / totalDuration : 0;
    const width =
        nBegin != null && nEnd != null
            ? (100 * (nEnd - nBegin)) / totalDuration
            : 100;

    const label = `\u0394${formatDuration(duration)}`;

    return (
        <div
            className="span"
            style={{
                left: `${start}%`,
                width: `${width}%`,
            }}
        >
            <div className="value">{label}</div>
        </div>
    );
};

export default TimeSpanLabel;
