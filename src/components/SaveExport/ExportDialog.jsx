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

import React, { useState, useEffect, useRef } from 'react';
import fs from 'fs';
import { useDispatch, useSelector } from 'react-redux';
import { logger } from 'nrfconnect/core';
import { remote } from 'electron';
import { join, dirname } from 'path';
import * as mathjs from 'mathjs';

import Modal from 'react-bootstrap/Modal';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ProgressBar from 'react-bootstrap/ProgressBar';

import { Toggle } from '../../from_pc-nrfconnect-shared';
import { appState, hideExportDialog } from '../../reducers/appReducer';
import { chartState } from '../../reducers/chartReducer';
import { options, timestampToIndex, indexToTimestamp } from '../../globals';

import { lastSaveDir, setLastSaveDir } from '../../utils/persistentStore';

import './saveexport.scss';

const { unit } = mathjs;

// create and array of [index, length] to split longer range
const indexer = (i, j, d) => {
    let k = i;
    const r = [];
    while (d < j - k) {
        r.push([k, d]);
        k += d;
    }
    if (k < j) {
        r.push([k, j - k]);
    }
    return r;
};

const selectivePrint = (strArr, selectArr) =>
    `${strArr.filter((_, i) => selectArr[i]).join(',')}\n`;

const exportChart = (
    filename,
    indexBegin,
    indexEnd,
    index,
    { timestamp, current, bits, bitsSeparated },
    setProgress,
    cancel
) => dispatch => {
    if (!filename) {
        return Promise.resolve();
    }
    const fd = fs.openSync(filename, 'w');
    const selection = [timestamp, current, bits, bitsSeparated];
    fs.writeSync(
        fd,
        selectivePrint(
            [
                'Timestamp(ms)',
                'Current(uA)',
                'D0-D7',
                'D0,D1,D2,D3,D4,D5,D6,D7',
            ],
            selection
        )
    );

    return indexer(indexBegin, indexEnd, 10000)
        .map(([start, len]) => () =>
            new Promise((resolve, reject) => {
                if (cancel.current) {
                    reject();
                }
                let content = '';
                for (let n = start; n <= start + len; n += 1) {
                    const k = (n + options.data.length) % options.data.length;
                    const v = options.data[k];
                    if (!Number.isNaN(v)) {
                        const b = options.bits
                            ? options.bits[k].toString(2).padStart(8, '0')
                            : '';
                        content += selectivePrint(
                            [
                                indexToTimestamp(n, index) / 1000,
                                v.toFixed(3),
                                b,
                                b.split('').join(','),
                            ],
                            selection
                        );
                    }
                }
                fs.write(fd, content, () => {
                    setProgress(
                        Math.round(
                            ((start - indexBegin) / (indexEnd - indexBegin)) *
                                100
                        )
                    );
                    resolve();
                });
            })
        )
        .reduce((prev, task) => prev.then(task), Promise.resolve())
        .catch(() => logger.info('Exported cancelled'))
        .then(() => {
            fs.closeSync(fd);
            dispatch(hideExportDialog());
            logger.info(`Exported CSV to: ${filename}`);
        });
};

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

export default () => {
    const dispatch = useDispatch();
    const {
        windowBegin,
        windowEnd,
        cursorBegin,
        cursorEnd,
        windowDuration,
        index,
        hasDigitalChannels,
    } = useSelector(chartState);
    const { isExportDialogVisible } = useSelector(appState);

    const [timestamp, TimestampToggle] = useToggledSetting(true, 'Timestamp');
    const [current, CurrentToggle] = useToggledSetting(true, 'Current');
    const [bits, BitsToggle] = useToggledSetting(
        hasDigitalChannels,
        'Digital logic pins (single string field)'
    );
    const [bitsSeparated, BitsSeparatedToggle] = useToggledSetting(
        false,
        'Digital logic pins (separate fields)'
    );

    const cancel = useRef(false);
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
    const duration = to - from;

    const indexBegin = Math.ceil(timestampToIndex(from, index));
    const indexEnd = Math.floor(timestampToIndex(to, index));

    const records = indexEnd - indexBegin;
    const recordLength =
        timestamp * 10 + current * 10 + bits * 8 + bitsSeparated * 16;
    const filesize = mathjs
        .to(unit(recordLength * records, 'bytes'), 'MB')
        .format({ notation: 'fixed', precision: 0 });

    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
    const filename = join(lastSaveDir(), `ppk-${now}.csv`);

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
        dispatch(
            exportChart(
                fn,
                indexBegin,
                indexEnd,
                index,
                { timestamp, current, bits, bitsSeparated },
                setProgress,
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
                                <p>{records} records</p>
                                <p>{filesize}</p>
                                <p>
                                    {unit(duration, 'us')
                                        .format({
                                            notation: 'auto',
                                            precision: 4,
                                        })
                                        .replace('u', '\u00B5')}
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <ProgressBar now={progress} animated className="mt-4" />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={saveFile}>
                    Save
                </Button>
                <Button variant="secondary" onClick={close}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
