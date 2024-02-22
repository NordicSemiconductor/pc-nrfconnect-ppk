/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

type DiskSpaceUsageBoxProps = {
    label: string;
    title?: string;
    value: React.ReactNode;
    actions?: { action: () => void; label: string }[];
};

export default ({ label, value, actions, title }: DiskSpaceUsageBoxProps) => (
    <div className="tw-flex tw-max-w-[100%] tw-grow tw-flex-row tw-items-center tw-justify-between tw-gap-2 tw-border tw-border-gray-200 tw-px-2 tw-py-1 tw-text-gray-400">
        <div className="tw tw-flex tw-flex-col tw-gap-1 tw-overflow-hidden">
            <div>{label}</div>
            <div
                title={title}
                className="tw-overflow-hidden tw-text-ellipsis tw-text-sm tw-text-gray-700"
            >
                <span>{value}</span>
            </div>
        </div>
        {actions && actions?.length > 0 && (
            <div className="tw-flex tw-grow tw-flex-col tw-items-end tw-justify-end tw-gap-0.5">
                {actions?.map(action => (
                    <button
                        type="button"
                        className="tw-text-gray-700 tw-underline"
                        key={action.label}
                        onClick={action.action}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        )}
    </div>
);
