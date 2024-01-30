/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow } from '@electron/remote';
import { FormatOptions, unit } from 'mathjs';

export const calcFileSize = (
    bytes: number,
    formatOptions: FormatOptions = { notation: 'fixed' as const, precision: 1 }
) => {
    if (bytes > 1024 * 1024 * 1024 * 1024) {
        return unit(bytes, 'byte').to('TB').format(formatOptions);
    }
    if (bytes > 1024 * 1024 * 1024) {
        return unit(bytes, 'byte').to('GB').format(formatOptions);
    }
    if (bytes > 1024 * 1024) {
        return unit(bytes, 'byte').to('MB').format(formatOptions);
    }
    if (bytes > 1024) {
        return unit(bytes, 'byte').to('kB').format(formatOptions);
    }

    return unit(bytes, 'byte').to('MB').format(formatOptions);
};

export const selectDirectoryDialog = () =>
    new Promise<string>((resolve, reject) => {
        const dialogOptions = {
            title: 'Select a Directory',
            properties: ['openDirectory'],
            // eslint-disable-next-line no-undef
        } as Electron.OpenDialogOptions;
        dialog
            .showOpenDialog(getCurrentWindow(), dialogOptions)
            .then(({ filePaths }: { filePaths: string[] }) => {
                if (filePaths.length === 1) {
                    resolve(filePaths[0]);
                }
            })
            .catch(reject);
    });
