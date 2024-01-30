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
import { isSessionActive } from '../../slices/chartSlice';
import {
    dataLoggerState,
    setAutoStopSampling,
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
    const sessionActive = useSelector(isSessionActive);

    const { samplingRunning } = useSelector(appState);
    const { sampleFreq, duration, durationUnit, autoStopSampling } =
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
                onToggle={v => dispatch(setAutoStopSampling(v))}
                isToggled={autoStopSampling}
            >
                Auto stop sampling
            </Toggle>
            {autoStopSampling && (
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
                            onChangeComplete={() => {}}
                            disabled={samplingRunning || sessionActive}
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
            {!autoStopSampling && (
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
