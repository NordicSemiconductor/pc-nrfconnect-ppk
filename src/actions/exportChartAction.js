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

import { logger } from 'nrfconnect/core';
import fs from 'fs';
import { options, indexToTimestamp } from '../globals';
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
    cancel
) => dispatch => {
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
        .map(([start, len]) => () =>
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
            dispatch(hideExportDialog());
            logger.info(`Exported CSV to: ${filename}`);
        })
        .finally(() => fs.closeSync(fd));
};
