/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React, { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import { useDispatch, useSelector } from 'react-redux';
import { remote } from 'electron';
import * as mathjs from 'mathjs';
import { dirname, join } from 'path';

import exportChart from '../../actions/exportChartAction';
import { Toggle } from '../../from_pc-nrfconnect-shared';
import { options, timestampToIndex } from '../../globals';
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

    const cancel = useRef(false);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        setProgress(0);
        if (isExportDialogVisible) {
            cancel.current = false;
        }
    }, [isExportDialogVisible]);

    const end = windowEnd || options.timestamp;
    const begin = windowBegin || end - windowDuration;

    const [from, to] =
        cursorBegin === null ? [begin, end] : [cursorBegin, cursorEnd];

    const indexBegin = Math.ceil(timestampToIndex(from));
    const indexEnd = Math.floor(timestampToIndex(to));
    const numberOfRecords = indexEnd - indexBegin + 1;
    const filesize = calculateTotalSize(contentSelection, numberOfRecords);

    const filename = createFileName();

    const duration = to - from;
    const formattedDuration = unit(duration, 'us')
        .format({
            notation: 'auto',
            precision: 4,
        })
        .replace('u', '\u00B5');

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
                                <p>{filesize}</p>
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
