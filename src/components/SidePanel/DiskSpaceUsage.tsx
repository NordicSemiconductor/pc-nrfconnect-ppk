/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectedDevice } from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    getDiskFullTrigger,
    getSessionRootFolder,
} from '../../slices/appSlice';
import { formatDurationHTML } from '../../utils/duration';
import {
    calcFileSize,
    getFreeSpace,
    remainingTime as calcRemainingTime,
} from '../../utils/fileUtils';
import DiskSpaceUsageBox from './DiskSpaceUsageBox';

export default () => {
    const sessionFolder = useSelector(getSessionRootFolder);
    const diskFullTrigger = useSelector(getDiskFullTrigger);
    const device = useSelector(selectedDevice);

    const [freeSpace, setFreeSpace] = useState<number>(0);
    const [remainingTime, setRemainingTime] = useState<number>(0);

    useEffect(() => {
        const action = () => {
            getFreeSpace(diskFullTrigger, sessionFolder).then(space => {
                setRemainingTime(calcRemainingTime(space));
                setFreeSpace(space);
            });
        };
        action();
        const timerId = setTimeout(action, 5000);
        return () => {
            clearTimeout(timerId);
        };
    }, [diskFullTrigger, sessionFolder]);

    return (
        <div className="tw-preflight tw-flex tw-flex-row tw-flex-wrap tw-gap-1">
            {device && (
                <>
                    <DiskSpaceUsageBox
                        label="Free"
                        value={calcFileSize(freeSpace)}
                    />
                    <DiskSpaceUsageBox
                        label="Remaining Time"
                        value={formatDurationHTML(remainingTime)}
                    />
                </>
            )}
        </div>
    );
};
