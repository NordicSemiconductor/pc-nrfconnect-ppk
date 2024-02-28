/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    logger,
    StateSelector,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { DataManager } from '../../globals';

interface ExportSelection {
    isExportDialogVisible: boolean;
    setTimestampBegin: (value: number) => void;
    setTimestampEnd: (value: number) => void;
    windowEnd: number;
    cursorBegin?: number | null;
    cursorEnd?: number | null;
    windowDuration: number;
}

export default ({
    isExportDialogVisible,
    setTimestampBegin,
    setTimestampEnd,
    windowEnd,
    cursorBegin,
    cursorEnd,
    windowDuration,
}: ExportSelection) => {
    const setExportTimestamp = useCallback(
        (begin: number, end: number) => {
            setTimestampBegin(begin);
            setTimestampEnd(end);
        },
        [setTimestampBegin, setTimestampEnd]
    );

    const [radioValue, setRadioValue] = useState(0);
    const exportSelection = useMemo(
        () => [
            {
                name: 'All',
                value: 0,
                id: 'radio-export-all',
                onSelect: () => {
                    setExportTimestamp(0, DataManager().getTimestamp());
                },
            },
            {
                name: 'Window',
                value: 1,
                id: 'radio-export-window',
                onSelect: () => {
                    const end = Math.min(
                        windowEnd,
                        DataManager().getTimestamp()
                    );

                    setExportTimestamp(Math.max(0, end - windowDuration), end);
                },
            },
            {
                name: 'Selected',
                value: 2,
                id: 'radio-export-selected',
                onSelect: () => {
                    if (cursorBegin != null && cursorEnd != null) {
                        setExportTimestamp(
                            Math.ceil(cursorBegin),
                            Math.trunc(cursorEnd)
                        );
                    }
                },
            },
        ],
        [cursorBegin, cursorEnd, setExportTimestamp, windowDuration, windowEnd]
    );

    const updateRadioSelected = useCallback(
        (value: number) => {
            switch (value) {
                case 0:
                    setRadioValue(0);
                    exportSelection[0].onSelect();
                    break;
                case 1:
                    setRadioValue(1);
                    exportSelection[1].onSelect();
                    break;
                case 2:
                    setRadioValue(2);
                    exportSelection[2].onSelect();
                    break;
                default:
                    logger.error(`Unexpected radio selected: ${value}`);
            }
        },
        [exportSelection]
    );

    useEffect(() => {
        if (cursorBegin != null) {
            updateRadioSelected(2);
        } else {
            updateRadioSelected(1);
        }
    }, [cursorBegin, isExportDialogVisible, updateRadioSelected]);

    const items = exportSelection
        .filter(radio => radio.value !== 2 || cursorBegin != null)
        .map(radio => ({
            key: radio.id,
            renderItem: radio.name,
        }));

    return (
        <>
            <p className=" tw-pt-8 tw-text-[10px] tw-uppercase tw-tracking-[0.2rem] tw-text-gray-400">
                Area to export
            </p>
            <StateSelector
                items={items}
                onSelect={updateRadioSelected}
                selectedItem={items[radioValue]}
            />
        </>
    );
};
