/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- conservative refactoring, TODO: remove this line */
/* eslint-disable @typescript-eslint/no-explicit-any -- conservative refactoring, TODO: remove this line */

import React from 'react';
import { classNames } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { Unit, unit } from 'mathjs';

import { formatDurationHTML } from '../../utils/duration';

import './statbox.scss';

interface ValueProperties {
    label: string;
    u: Unit;
}

const Value = ({ label, u }: ValueProperties) => {
    const v = u.format({ notation: 'fixed', precision: 2 });
    const [valStr, unitStr] = v.split(' ');
    return (
        <div className="value-box tw-border tw-border-solid tw-border-gray-200">
            <div className="value">
                {Number.isNaN(u.value) || (
                    <>
                        {valStr}
                        <span className="unit">
                            {unitStr.replace('u', '\u00B5')}
                        </span>
                    </>
                )}
            </div>
            {label}
        </div>
    );
};

interface StatBoxProperties {
    average?: number | null;
    max?: number | null;
    delta?: number | null;
    label: 'Window' | 'Selection';
    actionButtons?: any[];
}

const StatBox = ({
    average = null,
    max = null,
    delta = null,
    label,
    actionButtons = [],
}: StatBoxProperties) => (
    <div className="statbox d-flex flex-column mb-1">
        <div className="statbox-header">
            <h2 className="d-inline my-0">{label}</h2>
            {actionButtons.length > 0 && actionButtons.map(button => button)}
        </div>
        <div
            className={`d-flex flex-fill flex-row ${classNames(
                label === 'Window' ? 'tw-bg-white' : 'tw-bg-gray-100'
            )}`}
        >
            {delta === null && (
                <div className="value-box">
                    Hold SHIFT+LEFT CLICK and DRAG to make a selection
                </div>
            )}
            {delta !== null && (
                <>
                    <Value label="average" u={unit(average!, 'uA')} />
                    <Value label="max" u={unit(max || 0, 'uA')} />
                    <div className="value-box tw-border tw-border-solid tw-border-gray-200">
                        {formatDurationHTML(delta)}time
                    </div>
                    <Value
                        label="charge"
                        u={unit(average! * ((delta || 1) / 1e6), 'uC')}
                    />
                </>
            )}
        </div>
    </div>
);

export default StatBox;
