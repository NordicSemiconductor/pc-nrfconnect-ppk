/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import fs from 'fs';
import { logger } from 'pc-nrfconnect-shared';

import { indexToTimestamp, options } from '../globals';
import { hideExportDialog } from '../reducers/appReducer';
import { averagedBitState } from '../utils/bitConversion';

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

export const formatDataForExport = (
    start,
    length,
    bufferData,
    bitsData,
    selection
) => {
    let content = '';
    const dc = Array(8).fill(0);
    for (let n = start; n <= start + length; n += 1) {
        const k = (n + bufferData.length) % bufferData.length;
        const value = bufferData[k];
        if (!Number.isNaN(value)) {
            if (bitsData) {
                const bitstring = dc.map(
                    (_, i) =>
                        ['-', '0', '1', 'X'][averagedBitState(bitsData[k], i)]
                );
                content += selectivePrint(
                    [
                        indexToTimestamp(n) / 1000,
                        value.toFixed(3),
                        bitstring.join(''),
                        bitstring.join(','),
                    ],
                    selection
                );
            } else {
                content += selectivePrint(
                    [indexToTimestamp(n) / 1000, value.toFixed(3), '', ''],
                    selection
                );
            }
        }
    }
    return content;
};

export default (
        filename,
        indexBegin,
        indexEnd,
        contentSelection,
        setProgress,
        setExporting,
        cancel
    ) =>
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

        return indexer(indexBegin, indexEnd, 10000)
            .map(
                ([start, len]) =>
                    () =>
                        new Promise((resolve, reject) => {
                            if (cancel.current) {
                                reject();
                            }
                            const content = formatDataForExport(
                                start,
                                len,
                                options.data,
                                options.bits,
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
                                resolve();
                            });
                        })
            )
            .reduce((prev, task) => prev.then(task), Promise.resolve())
            .catch(() => logger.info('Export cancelled'))
            .then(() => {
                dispatch(hideExportDialog());
                logger.info(`Exported CSV to: ${filename}`);
            })
            .finally(() => {
                fs.closeSync(fd);
                setExporting(false);
            });
    };
