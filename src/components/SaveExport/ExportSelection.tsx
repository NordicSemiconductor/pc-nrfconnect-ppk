/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';

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
                            Math.floor(cursorEnd)
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

    return (
        <>
            <p className=" tw-pt-8 tw-text-xs tw-uppercase tw-tracking-wider tw-text-gray-400">
                Area to export
            </p>
            <ToggleButtonGroup
                type="radio"
                name="radio-export"
                className="radio-export"
                value={radioValue}
            >
                {exportSelection
                    .filter(radio => radio.value !== 2 || cursorBegin != null)
                    .map(radio => (
                        <ToggleButton
                            id={radio.id}
                            key={radio.id}
                            value={radio.value}
                            type="radio"
                            variant={
                                radioValue === radio.value ? 'set' : 'unset'
                            }
                            checked={radioValue === radio.value}
                            onChange={() => updateRadioSelected(radio.value)}
                        >
                            {radio.name}
                        </ToggleButton>
                    ))}
            </ToggleButtonGroup>
        </>
    );
};
