/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { useDispatch, useSelector } from 'react-redux';
import { dialog, getCurrentWindow } from '@electron/remote';
import {
    DialogButton,
    GenericDialog,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import * as mathjs from 'mathjs';
import { dirname, join } from 'path';

import exportChart from '../../actions/exportChartAction';
import { timestampToIndex } from '../../globals';
import { appState, hideExportDialog } from '../../slices/appSlice';
import { getChartXAxisRange, getCursorRange } from '../../slices/chartSlice';
import { getLastSaveDir, setLastSaveDir } from '../../utils/persistentStore';
import ExportSelection from './ExportSelection';

import './saveexport.scss';

const { unit } = mathjs;

const useToggledSetting = (
    initialState: boolean,
    label: string
): [boolean, React.ElementType] => {
    const [value, setValue] = useState(initialState);

    const ToggleComponent = () => (
        <div className="export-toggle">
            <Toggle
                onToggle={() => setValue(!value)}
                isToggled={value}
                label={label}
                variant="secondary"
            />
        </div>
    );
    return [value, ToggleComponent];
};

const calculateTotalSize = (
    [
        timestampToggled,
        currentToggled,
        bitsToggled,
        bitsSeparatedToggled,
    ]: readonly [boolean, boolean, boolean, boolean],
    numberOfRecords: number
) => {
    const recordLength =
        (timestampToggled ? 1 : 0) * 10 +
        (currentToggled ? 1 : 0) * 10 +
        (bitsToggled ? 1 : 0) * 8 +
        (bitsSeparatedToggled ? 1 : 0) * 16;

    return mathjs
        .unit(recordLength * numberOfRecords, 'bytes')
        .to('MB')
        .format({ notation: 'fixed', precision: 0 });
};

const createFileName = () => {
    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    return join(getLastSaveDir(), `ppk-${now}.csv`);
};

export default () => {
    const dispatch = useDispatch();
    const { cursorBegin, cursorEnd } = useSelector(getCursorRange);
    const { windowEnd, windowDuration } = useSelector(getChartXAxisRange);
    const { isExportDialogVisible } = useSelector(appState);

    const [timestampBegin, setTimestampBegin] = useState<number | null>(null);
    const [timestampEnd, setTimestampEnd] = useState<number | null>(null);
    const [numberOfRecords, setNumberOfRecords] = useState<number | null>(null);
    const [fileSize, setFileSize] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [formattedDuration, setFormattedDuration] = useState('');

    const [timestampToggled, TimestampToggle] = useToggledSetting(
        true,
        'Timestamp'
    );
    const [currentToggled, CurrentToggle] = useToggledSetting(true, 'Current');
    const [bitsToggled, BitsToggle] = useToggledSetting(
        true,
        'Digital logic pins (single string field)'
    );
    const [bitsSeparatedToggled, BitsSeparatedToggle] = useToggledSetting(
        false,
        'Digital logic pins (separate fields)'
    );
    const contentSelection: readonly [boolean, boolean, boolean, boolean] =
        useMemo(
            () =>
                [
                    timestampToggled,
                    currentToggled,
                    bitsToggled,
                    bitsSeparatedToggled,
                ] as const,
            [
                bitsSeparatedToggled,
                bitsToggled,
                currentToggled,
                timestampToggled,
            ]
        );
    const cancel = useRef(false);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(0);
        if (isExportDialogVisible) {
            cancel.current = false;
        }
    }, [isExportDialogVisible]);

    useEffect(() => {
        if (timestampEnd == null || timestampBegin == null) return;
        const records =
            timestampToIndex(timestampEnd) - timestampToIndex(timestampBegin);

        setNumberOfRecords(records);
        setFileSize(calculateTotalSize(contentSelection, records));
        if (timestampBegin != null && timestampEnd != null) {
            if (timestampBegin != null && timestampEnd != null) {
                setDuration(timestampEnd - timestampBegin);
            }
        }
    }, [contentSelection, timestampBegin, timestampEnd]);

    useEffect(() => {
        setFormattedDuration(
            unit(duration, 'us')
                .format({
                    notation: 'auto',
                    precision: 4,
                })
                .replace('u', '\u00B5')
        );
    }, [duration]);

    const close = useCallback(() => {
        cancel.current = true;
        dispatch(hideExportDialog());
    }, [dispatch]);

    const saveFile = async () => {
        const filename = createFileName();
        const { filePath: fn } = await dialog.showSaveDialog(
            getCurrentWindow(),
            {
                defaultPath: filename,
                filters: [
                    {
                        name: 'Comma separated values',
                        extensions: ['csv'],
                    },
                ],
            }
        );
        if (!fn || timestampBegin == null || timestampEnd == null) return;
        setLastSaveDir(dirname(fn));
        setExporting(true);
        dispatch(
            exportChart(
                fn,
                timestampBegin,
                timestampEnd,
                contentSelection,
                setProgress,
                setExporting,
                cancel
            )
        );
    };
    return (
        <GenericDialog
            className="tw-preflight"
            title="Export selection to CSV"
            footer={
                <>
                    <DialogButton
                        variant="primary"
                        onClick={saveFile}
                        disabled={
                            exporting ||
                            (!timestampToggled &&
                                !currentToggled &&
                                !bitsToggled &&
                                !bitsSeparatedToggled)
                        }
                    >
                        Save
                    </DialogButton>
                    <DialogButton variant="secondary" onClick={close}>
                        Close
                    </DialogButton>
                </>
            }
            isVisible={isExportDialogVisible}
            onHide={close}
        >
            <div className="tw-flex tw-flex-col tw-gap-4">
                <div className="tw-flex tw-flex-row tw-gap-4">
                    <div className="tw-flex tw-h-full tw-flex-1 tw-grow-[2] tw-flex-col tw-gap-2 tw-border tw-border-gray-200 tw-p-4 ">
                        <ExportSelection
                            isExportDialogVisible={isExportDialogVisible}
                            setTimestampBegin={setTimestampBegin}
                            setTimestampEnd={setTimestampEnd}
                            windowEnd={windowEnd}
                            cursorBegin={cursorBegin}
                            cursorEnd={cursorEnd}
                            windowDuration={windowDuration}
                        />
                        <p className=" tw-pt-8 tw-text-[10px] tw-uppercase tw-tracking-[0.2rem] tw-text-gray-400">
                            Export fields
                        </p>
                        <div className="tw-w-fit">
                            <TimestampToggle />
                            <CurrentToggle />
                            <BitsToggle />
                            <BitsSeparatedToggle />
                        </div>
                    </div>

                    <div className="tw-flex-1 tw-grow tw-border tw-border-gray-200 ">
                        <div className="tw-flex tw-flex-col tw-gap-2 tw-p-4">
                            <p className="tw-pt-8 tw-text-[10px] tw-uppercase tw-tracking-[0.2rem] tw-text-gray-400">
                                Estimation
                            </p>
                            <p>{numberOfRecords} records</p>
                            <p>{fileSize}</p>
                            <p>{formattedDuration}</p>
                        </div>
                    </div>
                </div>

                <ProgressBar now={progress} animated />
            </div>
        </GenericDialog>
    );
};
