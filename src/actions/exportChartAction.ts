/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';
import fs from 'fs';

import { DataManager, indexToTimestamp } from '../globals';
import { hideExportDialog } from '../slices/appSlice';
import { TDispatch } from '../slices/thunk';
import { averagedBitState } from '../utils/bitConversion';

// create and array of [index, length] to split longer range
const indexer = (indexBegin: number, indexEnd: number, length: number) => {
    let movingIndex = indexBegin;
    const buffer = [];
    while (length < indexEnd - movingIndex) {
        buffer.push([movingIndex, length]);
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
    length: number,
    bufferData: Float32Array,
    bitsData: Uint16Array | null,
    selection: readonly [boolean, boolean, boolean, boolean]
) => {
    let content = '';
    const dc = Array(8).fill(0);
    for (let n = 0; n <= length; n += 1) {
        const value = bufferData.getFloat32(n);
        if (!Number.isNaN(value)) {
            if (bitsData) {
                const bitstring = dc.map(
                    (_, i) =>
                        ['-', '0', '1', 'X'][averagedBitState(bitsData[n], i)]
                );
                content += selectivePrint(
                    [
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        indexToTimestamp(n)! / 1000,
                        value.toFixed(3),
                        bitstring.join(''),
                        bitstring.join(','),
                    ],
                    selection
                );
            } else {
                content += selectivePrint(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    [indexToTimestamp(n)! / 1000, value.toFixed(3), '', ''],
                    selection
                );
            }
        }
    }
    return content;
};

export default (
        filename: string,
        indexBegin: number,
        indexEnd: number,
        contentSelection: readonly [boolean, boolean, boolean, boolean],
        setProgress: (progress: number) => void,
        setExporting: (value: boolean) => void,
        cancel: React.RefObject<boolean>
    ) =>
    (dispatch: TDispatch) => {
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

        return (
            indexer(indexBegin, indexEnd, 10000)
                .map(
                    ([start, len]) =>
                        () =>
                            new Promise((resolve, reject) => {
                                if (cancel.current) {
                                    reject();
                                }
                                const content = formatDataForExport(
                                    len,
                                    DataManager().getData(),
                                    DataManager().getDataBits(),
                                    contentSelection
                                );
                                fs.write(fd, content, () => {
                                    setProgress(
                                        Math.round(
                                            ((start - indexBegin) /
                                                (indexEnd - indexBegin)) *
                                                100
                                        )
                                    );
                                    resolve(undefined);
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
                })
                .finally(() => {
                    fs.closeSync(fd);
                    setExporting(false);
                })
        );
    };
