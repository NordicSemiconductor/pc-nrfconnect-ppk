/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Dropdown,
    DropdownItem,
    NumberInlineInput,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import {
    dataLoggerState,
    setSampleIndefinitely,
    updateDuration,
    updateDurationUnit,
} from '../../slices/dataLoggerSlice';
import { convertTimeToSeconds } from '../../utils/duration';
import { calcFileSize } from '../../utils/fileUtils';
import { TimeUnit } from '../../utils/persistentStore';

const fmtOpts = { notation: 'fixed' as const, precision: 1 };

const calcFileSizeString = (sampleFreq: number, durationSeconds: number) => {
    const bytes = sampleFreq * durationSeconds * 6;
    return calcFileSize(bytes, fmtOpts);
};

export default () => {
    const dispatch = useDispatch();

    const { samplingRunning } = useSelector(appState);
    const { sampleFreq, duration, durationUnit, sampleIndefinitely } =
        useSelector(dataLoggerState);

    const uintDropdownItem: DropdownItem<TimeUnit>[] = [
        { value: 's', label: 'seconds' },
        { value: 'm', label: 'minutes' },
        { value: 'h', label: 'hours' },
        { value: 'd', label: 'days' },
    ];

    return (
        <>
            <Toggle
                onToggle={v => dispatch(setSampleIndefinitely(v))}
                isToggled={sampleIndefinitely}
            >
                Sample indefinitely
            </Toggle>
            {!sampleIndefinitely && (
                <>
                    <div className="tw-flex tw-grow tw-items-center">
                        <span className="tw-w-16">Sample for</span>
                        <NumberInlineInput
                            className="tw-w-30"
                            range={{
                                min: 1,
                                max: 9999999,
                            }}
                            value={duration}
                            onChange={(v: number) =>
                                dispatch(updateDuration(v))
                            }
                            disabled={samplingRunning}
                        />
                        <div className="tw-ml-4 tw-w-20">
                            <Dropdown
                                className="tw-w-full"
                                items={uintDropdownItem}
                                onSelect={v => {
                                    dispatch(updateDurationUnit(v.value));
                                }}
                                selectedItem={
                                    uintDropdownItem.find(
                                        v => v.value === durationUnit
                                    ) ?? uintDropdownItem[0]
                                }
                                disabled={samplingRunning}
                            />
                        </div>
                    </div>
                    <div className="small buffer-summary">
                        Estimated disk space required{' '}
                        {calcFileSizeString(
                            sampleFreq,
                            convertTimeToSeconds(duration, durationUnit)
                        )}
                    </div>
                </>
            )}
            {sampleIndefinitely && (
                <div className="small buffer-summary">
                    Estimated disk space required{' '}
                    {calcFileSizeString(
                        sampleFreq,
                        convertTimeToSeconds(1, 'h')
                    )}
                    <br />
                    per hour
                </div>
            )}
        </>
    );
};
