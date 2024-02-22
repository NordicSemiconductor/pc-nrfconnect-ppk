/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    DropdownItem,
    NumberInput,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    appState,
    getDiskFullTrigger,
    getSessionRootFolder,
} from '../../slices/appSlice';
import {
    dataLoggerState,
    updateDuration,
    updateDurationUnit,
} from '../../slices/dataLoggerSlice';
import { convertTimeToSeconds } from '../../utils/duration';
import { calcFileSize, getFreeSpace } from '../../utils/fileUtils';
import { TimeUnit } from '../../utils/persistentStore';

const fmtOpts = { notation: 'fixed' as const, precision: 1 };

const calcFileSizeString = (sampleFreq: number, durationSeconds: number) => {
    const bytes = sampleFreq * durationSeconds * 6;
    return calcFileSize(bytes, fmtOpts);
};

export default () => {
    const dispatch = useDispatch();

    const sessionFolder = useSelector(getSessionRootFolder);
    const diskFullTrigger = useSelector(getDiskFullTrigger);
    const { samplingRunning } = useSelector(appState);
    const { sampleFreq, duration, durationUnit } = useSelector(dataLoggerState);
    const sampleIndefinitely = durationUnit === 'inf';

    const uintDropdownItem: DropdownItem<TimeUnit>[] = [
        { value: 's', label: 'seconds' },
        { value: 'm', label: 'minutes' },
        { value: 'h', label: 'hours' },
        { value: 'd', label: 'days' },
        { value: 'inf', label: 'forever' },
    ];

    const [freeSpace, setFreeSpace] = useState<number>(0);

    useEffect(() => {
        const action = () => {
            getFreeSpace(diskFullTrigger, sessionFolder).then(space => {
                setFreeSpace(space);
            });
        };
        action();
        const timerId = setInterval(action, 5000);
        return () => {
            clearInterval(timerId);
        };
    }, [diskFullTrigger, sessionFolder]);

    return (
        <>
            <NumberInput
                label="Sample for"
                range={
                    sampleIndefinitely
                        ? [Infinity]
                        : {
                              min: 1,
                              max: 60 * 60,
                          }
                }
                value={sampleIndefinitely ? Infinity : duration}
                onChange={(v: number) => dispatch(updateDuration(v))}
                unit={{
                    selectedItem:
                        uintDropdownItem.find(v => v.value === durationUnit) ??
                        uintDropdownItem[0],
                    items: uintDropdownItem,
                    onUnitChange: v => {
                        dispatch(updateDurationUnit(v.value));
                    },
                }}
                disabled={samplingRunning}
                showSlider
                minWidth
            />

            {!sampleIndefinitely && (
                <div className="small buffer-summary">
                    Estimated disk space required{' '}
                    {calcFileSizeString(
                        sampleFreq,
                        convertTimeToSeconds(duration, durationUnit)
                    )}
                    . Current Available space {calcFileSize(freeSpace)}
                </div>
            )}
            {sampleIndefinitely && (
                <div className="small buffer-summary">
                    Estimated disk space required{' '}
                    {calcFileSizeString(
                        sampleFreq,
                        convertTimeToSeconds(1, 'h')
                    )}
                    <br />
                    per hour. Current Available space {calcFileSize(freeSpace)}
                </div>
            )}
        </>
    );
};
