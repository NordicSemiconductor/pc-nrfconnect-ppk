/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    AppThunk,
    logger,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import fs from 'fs';

import {
    DataManager,
    frameSize,
    indexToTimestamp,
    timestampToIndex,
} from '../globals';
import { RootState } from '../slices';
import { hideExportDialog } from '../slices/appSlice';
import EventAction from '../usageDataActions';
import { averagedBitState } from '../utils/bitConversion';

// create and array of [index, length] to split longer range
const indexer = (indexBegin: number, indexEnd: number, length: number) => {
    let movingIndex = indexBegin;
    const buffer = [];
    while (length < indexEnd - movingIndex) {
        buffer.push([movingIndex, length - 1]);
        movingIndex += length;
    }
    if (movingIndex < indexEnd) {
        buffer.push([movingIndex, indexEnd - movingIndex]);
    }
    return buffer;
};

const selectivePrint = (
    strArr: [number | string, string, string, string],
    selectArr: readonly [boolean, boolean, boolean, boolean]
) => `${strArr.filter((_, i) => selectArr[i]).join(',')}\n`;

export const formatDataForExport = (
    start: number,
    bufferData: Float32Array,
    bitsData: Uint16Array | null,
    selection: readonly [boolean, boolean, boolean, boolean]
) => {
    let content = '';
    const dc = Array(8).fill(0);
    for (let n = 0; n < bufferData.length; n += 1) {
        const value = bufferData[n];
        if (!Number.isNaN(value)) {
            if (bitsData) {
                const bitstring = dc.map(
                    (_, i) =>
                        ['-', '0', '1', 'X'][averagedBitState(bitsData[n], i)]
                );
                content += selectivePrint(
                    [
                        indexToTimestamp(n + start) / 1000,
                        value.toFixed(3),
                        bitstring.join(''),
                        bitstring.join(','),
                    ],
                    selection
                );
            } else {
                content += selectivePrint(
                    [
                        indexToTimestamp(n + start) / 1000,
                        value.toFixed(3),
                        '',
                        '',
                    ],
                    selection
                );
            }
        }
    }
    return content;
};

export default (
        filename: string,
        timestampBegin: number,
        timestampEnd: number,
        contentSelection: readonly [boolean, boolean, boolean, boolean],
        setProgress: (progress: number) => void,
        setExporting: (value: boolean) => void,
        cancel: React.RefObject<boolean>
    ): AppThunk<RootState, Promise<void>> =>
    dispatch => {
        if (!filename) {
            return Promise.resolve();
        }
        const fd = fs.openSync(filename, 'w');
        fs.writeSync(
            fd,
            selectivePrint(
                [
                    'Timestamp(ms)',
                    'Current(uA)',
                    'D0-D7',
                    'D0,D1,D2,D3,D4,D5,D6,D7',
                ],
                contentSelection
            )
        );

        const indexBegin = timestampToIndex(timestampBegin);
        const indexEnd = timestampToIndex(timestampEnd);

        const buffer = Buffer.alloc((indexEnd - indexBegin + 1) * frameSize);

        return (
            indexer(indexBegin, indexEnd, 10000)
                .map(
                    ([start, len]) =>
                        () =>
                            new Promise((resolve, reject) => {
                                if (cancel.current) {
                                    reject();
                                }
                                DataManager()
                                    .getData(
                                        buffer,
                                        indexToTimestamp(start),
                                        indexToTimestamp(start + len),
                                        'end'
                                    )
                                    .then(data => {
                                        const content = formatDataForExport(
                                            start,
                                            data.getAllCurrentData(),
                                            data.getAllBitData(),
                                            contentSelection
                                        );
                                        fs.write(fd, content, () => {
                                            setProgress(
                                                Math.round(
                                                    ((start - timestampBegin) /
                                                        (timestampEnd -
                                                            timestampBegin)) *
                                                        100
                                                )
                                            );
                                            resolve(undefined);
                                        });
                                    });
                            })
                )
                // @ts-expect-error dunno how to fix this at the moment.
                .reduce((prev, task) => prev.then(task), Promise.resolve())
                // @ts-expect-error Should be rewritten.
                .catch(() => logger.info('Export cancelled'))
                .then(() => {
                    dispatch(hideExportDialog());
                    logger.info(`Exported CSV to: ${filename}`);
                    telemetry.sendEvent(EventAction.EXPORT_DATA, {
                        timestampBegin,
                        timestampEnd,
                        exportType: 'CSV',
                    });
                })
                .finally(() => {
                    fs.closeSync(fd);
                    setExporting(false);
                })
        );
    };
