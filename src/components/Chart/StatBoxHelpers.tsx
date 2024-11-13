/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- conservative refactoring, TODO: remove this line */

import React from 'react';
import { classNames } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { Unit } from 'mathjs';

interface ValueProperties {
    label: string;
    u: Unit;
    white?: boolean;
}

export const ValueRaw = ({
    label,
    value,
    white,
}: {
    label: string;
    value: string | React.ReactElement<any, any> | null;
    white?: boolean;
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

export const Value = ({ label, u, white = false }: ValueProperties) => {
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
