/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- conservative refactoring, TODO: remove this line */

import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spinner } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { unit } from 'mathjs';

import { DataManager } from '../../globals';
import {
    chartCursorAction,
    getCursorRange,
    setLiveMode,
} from '../../slices/chartSlice';
import { formatDurationHTML } from '../../utils/duration';
import { Value, ValueRaw } from './StatBoxHelpers';

interface StatBoxProperties {
    average?: number | null;
    max?: number | null;
    delta?: number | null;
    processing?: boolean;
    progress?: number;
    resetCursor: () => void;
    chartWindow: (
        windowBegin: number,
        windowEnd: number,
        yMin?: number | null,
        yMax?: number | null
    ) => void;
}

export default ({
    average = null,
    max = null,
    delta = null,
    processing = false,
    progress,
    resetCursor,
    chartWindow,
}: StatBoxProperties) => {
    const dispatch = useDispatch();
    const { cursorBegin, cursorEnd } = useSelector(getCursorRange);

    const chartCursorActive = useMemo(
        () => cursorBegin !== null || cursorEnd !== null,
        [cursorBegin, cursorEnd]
    );

    return (
        <div className="tw-preflight tw-flex tw-w-80 tw-grow tw-flex-col tw-gap-1 tw-text-center">
            <div className="tw-flex tw-h-3.5 tw-items-center tw-justify-between">
                <h2 className="tw-inline tw-text-[10px] tw-uppercase">
                    Selection
                </h2>
                <div>
                    <button
                        type="button"
                        className="tw-float-right tw-border tw-border-gray-200 tw-bg-white tw-px-0.5 tw-text-[10px] tw-leading-3 active:enabled:tw-bg-gray-50"
                        key="clear-selection-btn"
                        disabled={!chartCursorActive}
                        onClick={resetCursor}
                    >
                        CLEAR
                    </button>
                    <button
                        type="button"
                        className="tw-float-right tw-border tw-border-gray-200 tw-bg-white tw-px-0.5 tw-text-[10px] tw-leading-3 active:enabled:tw-bg-gray-50"
                        key="select-all-btn"
                        disabled={
                            DataManager().getTotalSavedRecords() <= 0 ||
                            processing
                        }
                        onClick={() =>
                            dispatch(
                                chartCursorAction({
                                    cursorBegin: 0,
                                    cursorEnd: DataManager().getTimestamp(),
                                })
                            )
                        }
                    >
                        SELECT ALL
                    </button>
                    <button
                        type="button"
                        className="tw-float-right tw-border tw-border-gray-200 tw-bg-white tw-px-0.5 tw-text-[10px] tw-leading-3 active:enabled:tw-bg-gray-50"
                        key="zoom-to-selection-btn"
                        disabled={
                            cursorBegin == null ||
                            cursorEnd == null ||
                            processing
                        }
                        onClick={() => {
                            if (cursorBegin != null && cursorEnd != null) {
                                dispatch(setLiveMode(false));
                                chartWindow(cursorBegin, cursorEnd);
                            }
                        }}
                    >
                        ZOOM TO SELECTION
                    </button>
                </div>
            </div>
            <div className="tw-flex tw-flex-row tw-gap-[1px] tw-border tw-border-solid tw-border-gray-200 tw-bg-gray-200">
                {processing && (
                    <div className="tw-flex tw-h-14 tw-w-full tw-flex-row tw-items-center tw-justify-center tw-gap-2 tw-text-xs tw-text-gray-700">
                        Processing{' '}
                        {progress != null && `(${progress.toFixed(1)}%)`}
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
                        <Value label="average" u={unit(average!, 'uA')} />
                        <Value label="max" u={unit(max || 0, 'uA')} />
                        <ValueRaw
                            label="time"
                            value={formatDurationHTML(delta)}
                        />
                        <Value
                            label="charge"
                            u={unit(average! * ((delta || 1) / 1e6), 'uC')}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
