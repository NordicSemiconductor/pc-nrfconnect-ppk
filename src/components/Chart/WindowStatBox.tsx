/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- conservative refactoring, TODO: remove this line */

import React from 'react';
import { unit } from 'mathjs';

import { formatDurationHTML } from '../../utils/duration';
import { Value, ValueRaw } from './StatBoxHelpers';

interface StatBoxProperties {
    average?: number | null;
    max?: number | null;
    delta?: number | null;
}

export default ({
    average = null,
    max = null,
    delta = null,
}: StatBoxProperties) => (
    <div className="tw-preflight tw-flex tw-w-80 tw-grow tw-flex-col tw-gap-1 tw-text-center">
        <div className="tw-flex tw-h-3.5 tw-items-center tw-justify-between">
            <h2 className="tw-inline tw-text-[10px] tw-uppercase">Window</h2>
        </div>
        <div className="tw-flex tw-flex-row tw-gap-[1px] tw-border tw-border-solid tw-border-gray-200 tw-bg-gray-200">
            <Value label="average" u={unit(average!, 'uA')} white />
            <Value label="max" u={unit(max || 0, 'uA')} white />
            <ValueRaw
                label="time"
                value={formatDurationHTML(delta ?? 0)}
                white
            />
            <Value
                white
                label="charge"
                u={unit(average! * ((delta || 1) / 1e6), 'uC')}
            />
        </div>
    </div>
);
