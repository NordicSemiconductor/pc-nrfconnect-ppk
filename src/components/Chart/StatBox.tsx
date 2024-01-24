/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- conservative refactoring, TODO: remove this line */
/* eslint-disable @typescript-eslint/no-explicit-any -- conservative refactoring, TODO: remove this line */

import React from 'react';
import { classNames, Spinner } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { Unit, unit } from 'mathjs';

import { formatDurationHTML } from '../../utils/duration';

interface ValueProperties {
    label: string;
    u: Unit;
    white: boolean;
}

const ValueRaw = ({
    label,
    value,
    white,
}: {
    label: string;
    value: string | React.ReactElement<any, any> | null;
    white: boolean;
}) => (
    <div
        className={classNames(
            'tw-flex tw-h-14 tw-grow tw-flex-col tw-justify-center tw-p-0.5 tw-text-gray-700',
            white ? 'tw-bg-white' : 'tw-bg-gray-100'
        )}
    >
        <div className=" tw-h-7 tw-whitespace-nowrap tw-text-lg">{value}</div>
        <span className="tw-text-xs">{label}</span>
    </div>
);

const Value = ({ label, u, white }: ValueProperties) => {
    const v = u.format({ notation: 'fixed', precision: 2 });
    const [valStr, unitStr] = v.split(' ');
    return Number.isNaN(u.value)
        ? null
        : ValueRaw({
              label,
              value: (
                  <>
                      {valStr}
                      <span className="tw-text-xs">
                          {unitStr.replace('u', '\u00B5')}
                      </span>
                  </>
              ),
              white,
          });
};

interface StatBoxProperties {
    average?: number | null;
    max?: number | null;
    delta?: number | null;
    label: 'Window' | 'Selection';
    actionButtons?: React.ReactElement[];
    processing?: boolean;
    progress?: number;
}

const StatBox = ({
    average = null,
    max = null,
    delta = null,
    label,
    actionButtons = [],
    processing = false,
    progress,
}: StatBoxProperties) => (
    <div className="tw-preflight tw-flex tw-w-80 tw-grow tw-flex-col tw-gap-1 tw-text-center">
        <div className="tw-flex tw-h-3.5 tw-items-center tw-justify-between">
            <h2 className="tw-inline tw-text-[10px] tw-uppercase">{label}</h2>
            <div>{actionButtons}</div>
        </div>
        <div className="tw-flex tw-flex-row tw-gap-[1px] tw-border tw-border-solid tw-border-gray-200 tw-bg-gray-200">
            {processing && (
                <div className="tw-flex tw-h-14 tw-w-full tw-flex-row tw-items-center tw-justify-center tw-gap-2 tw-text-xs tw-text-gray-700">
                    Processing {progress != null && `(${progress.toFixed(1)}%)`}
                    <Spinner size="sm" />
                </div>
            )}
            {!processing && delta === null && (
                <div className="tw-flex tw-h-14 tw-w-full tw-flex-row tw-items-center tw-justify-center tw-bg-gray-100 tw-text-xs tw-text-gray-700">
                    Hold SHIFT+LEFT CLICK and DRAG to make a selection
                </div>
            )}
            {!processing && delta !== null && (
                <>
                    <Value
                        label="average"
                        u={unit(average!, 'uA')}
                        white={label === 'Window'}
                    />
                    <Value
                        label="max"
                        u={unit(max || 0, 'uA')}
                        white={label === 'Window'}
                    />
                    <ValueRaw
                        label="time"
                        value={formatDurationHTML(delta)}
                        white={label === 'Window'}
                    />
                    <Value
                        white={label === 'Window'}
                        label="charge"
                        u={unit(average! * ((delta || 1) / 1e6), 'uC')}
                    />
                </>
            )}
        </div>
    </div>
);

export default StatBox;
