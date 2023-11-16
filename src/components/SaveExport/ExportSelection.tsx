/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import { useSelector } from 'react-redux';
import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { options, timestampToIndex } from '../../globals';
import { isRealTimePane } from '../../utils/panes';

interface ExportSelection {
    isExportDialogVisible: boolean;
    setIndexBegin: (value: number) => void;
    setIndexEnd: (value: number) => void;
    windowEnd: number;
    cursorBegin?: number | null;
    cursorEnd?: number | null;
    windowDuration: number;
}

const ExportSelection = ({
    isExportDialogVisible,
    setIndexBegin,
    setIndexEnd,
    windowEnd,
    cursorBegin,
    cursorEnd,
    windowDuration,
}: ExportSelection) => {
    const isRealTime = useSelector(isRealTimePane);
    const setExportIndexes = (begin: number, end: number) => {
        setIndexBegin(begin);
        setIndexEnd(end);
    };

    const updateRadioSelected = (value: number) => {
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
    };

    const [radioValue, setRadioValue] = useState(0);
    const exportSelection = [
        {
            name: 'All',
            value: 0,
            id: 'radio-export-all',
            onSelect: () => {
                setExportIndexes(0, options.index);
            },
        },
        {
            name: 'Window',
            value: 1,
            id: 'radio-export-window',
            onSelect: () => {
                const end = windowEnd;
                if (end == null) {
                    logger.error(
                        'exportSelection: End of selection is invalid, try to export all.'
                    );
                    return;
                }

                const start = Math.min(0, end - windowDuration);
                setExportIndexes(
                    Math.ceil(timestampToIndex(start < 0 ? 0 : start)),
                    Math.floor(timestampToIndex(end))
                );
            },
        },
        {
            name: 'Selected',
            value: 2,
            id: 'radio-export-selected',
            onSelect: () => {
                if (cursorBegin != null && cursorEnd != null) {
                    setExportIndexes(
                        Math.ceil(timestampToIndex(cursorBegin)),
                        Math.floor(timestampToIndex(cursorEnd))
                    );
                }
            },
        },
    ];

    useEffect(() => {
        if (cursorBegin != null) {
            updateRadioSelected(2);
        } else {
            updateRadioSelected(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExportDialogVisible]);

    return (
        <>
            <h2>Area to export</h2>
            <ToggleButtonGroup
                type="radio"
                name="radio-export"
                className="radio-export"
                value={radioValue}
            >
                {exportSelection
                    .filter(radio => !isRealTime || radio.name !== 'All')
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
            </ToggleButtonGroup>{' '}
        </>
    );
};

export default ExportSelection;
