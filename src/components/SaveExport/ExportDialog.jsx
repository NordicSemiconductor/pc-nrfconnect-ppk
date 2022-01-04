/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import { useDispatch, useSelector } from 'react-redux';
import { remote } from 'electron';
import * as mathjs from 'mathjs';
import { dirname, join } from 'path';
import { logger, Toggle } from 'pc-nrfconnect-shared';

import exportChart from '../../actions/exportChartAction';
import { indexToTimestamp, options, timestampToIndex } from '../../globals';
import { appState, hideExportDialog } from '../../reducers/appReducer';
import { chartState } from '../../reducers/chartReducer';
import { getLastSaveDir, setLastSaveDir } from '../../utils/persistentStore';

import './saveexport.scss';

const { unit } = mathjs;

const useToggledSetting = (initialState, label) => {
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
    [timestampToggled, currentToggled, bitsToggled, bitsSeparatedToggled],
    numberOfRecords
) => {
    const recordLength =
        timestampToggled * 10 +
        currentToggled * 10 +
        bitsToggled * 8 +
        bitsSeparatedToggled * 16;
    return mathjs
        .to(unit(recordLength * numberOfRecords, 'bytes'), 'MB')
        .format({ notation: 'fixed', precision: 0 });
};

const createFileName = () => {
    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    return join(getLastSaveDir(), `ppk-${now}.csv`);
};

export default () => {
    const dispatch = useDispatch();
    const {
        windowBegin,
        windowEnd,
        cursorBegin,
        cursorEnd,
        windowDuration,
        hasDigitalChannels,
    } = useSelector(chartState);
    const { isExportDialogVisible } = useSelector(appState);

    const [indexBegin, setIndexBegin] = useState(null);
    const [indexEnd, setIndexEnd] = useState(null);
    const [numberOfRecords, setNumberOfRecords] = useState(null);
    const [fileSize, setFileSize] = useState(null);
    const [duration, setDuration] = useState(0);
    const [formattedDuration, setFormattedDuration] = useState('');

    const [timestampToggled, TimestampToggle] = useToggledSetting(
        true,
        'Timestamp'
    );
    const [currentToggled, CurrentToggle] = useToggledSetting(true, 'Current');
    const [bitsToggled, BitsToggle] = useToggledSetting(
        hasDigitalChannels,
        'Digital logic pins (single string field)'
    );
    const [bitsSeparatedToggled, BitsSeparatedToggle] = useToggledSetting(
        false,
        'Digital logic pins (separate fields)'
    );
    const contentSelection = [
        timestampToggled,
        currentToggled,
        bitsToggled,
        bitsSeparatedToggled,
    ];

    const setExportIndexes = (begin, end) => {
        setIndexBegin(begin);
        setIndexEnd(end);
    };

    const [radioValue, setRadioValue] = useState(0);
    const radios = [
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
                /* If no windowEnd is provided, then assume you want the last timestamp recorded.
                If no windowBegin, take calculate beginning of window by subtracting the "size" of
                the window from the end.
                At last, if the starting point is less than zero, start at index zero instead.
                */
                const end = windowEnd || options.timestamp;
                const start = windowBegin || end - windowDuration;
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
                setExportIndexes(
                    Math.ceil(timestampToIndex(cursorBegin)),
                    Math.floor(timestampToIndex(cursorEnd))
                );
            },
        },
    ];

    const updateRadioSelected = value => {
        switch (value) {
            case 0:
                setRadioValue(0);
                radios[0].onSelect();
                break;
            case 1:
                setRadioValue(1);
                radios[1].onSelect();
                break;
            case 2:
                setRadioValue(2);
                radios[2].onSelect();
                break;
            default:
                logger.error(`Unexpected radio selected: ${value}`);
        }
    };

    const cancel = useRef(false);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        setProgress(0);
        if (isExportDialogVisible) {
            cancel.current = false;
        }

        if (cursorBegin !== null) {
            updateRadioSelected(2);
        } else {
            updateRadioSelected(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExportDialogVisible]);

    useEffect(() => {
        const records = indexEnd - indexBegin + 1;
        setNumberOfRecords(records);
        setFileSize(calculateTotalSize(contentSelection, records));
        setDuration(indexToTimestamp(indexEnd) - indexToTimestamp(indexBegin));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indexBegin, indexEnd]);

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
    const filename = createFileName();
    const close = () => {
        cancel.current = true;
        dispatch(hideExportDialog());
    };
    const saveFile = async () => {
        const { filePath: fn } = await remote.dialog.showSaveDialog({
            defaultPath: filename,
        });
        if (!fn) return;
        setLastSaveDir(dirname(fn));
        setExporting(true);
        dispatch(
            exportChart(
                fn,
                indexBegin,
                indexEnd,
                contentSelection,
                setProgress,
                setExporting,
                cancel
            )
        );
    };
    return (
        <Modal
            show={isExportDialogVisible}
            className="export-dialog"
            onHide={close}
        >
            <Modal.Header closeButton>
                <Modal.Title>Export selection to CSV</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row className="export-settings">
                    <Col sm={8}>
                        <Card className="h-100">
                            <Card.Body>
                                <h2>Area to export</h2>
                                <ToggleButtonGroup
                                    type="radio"
                                    name="radio-export"
                                    className="radio-export"
                                    value={radioValue}
                                >
                                    {radios
                                        .filter(
                                            radio =>
                                                radio.value !== 2 ||
                                                cursorBegin !== null
                                        )
                                        .map(radio => (
                                            <ToggleButton
                                                id={radio.id}
                                                key={radio.id}
                                                value={radio.value}
                                                type="radio"
                                                variant="secondary"
                                                checked={
                                                    radioValue === radio.value
                                                }
                                                onChange={() =>
                                                    updateRadioSelected(
                                                        radio.value
                                                    )
                                                }
                                            >
                                                {radio.name}
                                            </ToggleButton>
                                        ))}
                                </ToggleButtonGroup>
                                <h2>Export fields</h2>
                                <div className="w-fit-content">
                                    <TimestampToggle />
                                    <CurrentToggle />
                                    {hasDigitalChannels && (
                                        <>
                                            <BitsToggle />
                                            <BitsSeparatedToggle />
                                        </>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col sm={4}>
                        <Card className="h-100">
                            <Card.Body>
                                <h2>Estimation</h2>
                                <p>{numberOfRecords} records</p>
                                <p>{fileSize}</p>
                                <p>{formattedDuration}</p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <ProgressBar now={progress} animated className="mt-4" />
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant="primary"
                    onClick={saveFile}
                    disabled={exporting}
                >
                    Save
                </Button>
                <Button variant="secondary" onClick={close}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
