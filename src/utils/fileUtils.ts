/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { dialog, getCurrentWindow } from '@electron/remote';
import fs from 'fs/promises';
import { FormatOptions, unit } from 'mathjs';

import { frameSize, indexToTimestamp } from '../globals';

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

export const selectDirectoryDialog = (defaultPath?: string) =>
    new Promise<string>((resolve, reject) => {
        const dialogOptions = {
            title: 'Select a Directory',
            properties: ['openDirectory'],
            defaultPath,
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

export const isDiskFull = async (triggerLimit: number, dstPath: string) => {
    const stats = await fs.statfs(dstPath);
    const freeDiskSpaceBytes = stats.bfree * stats.bsize;
    const freeSpaceBytes = freeDiskSpaceBytes;
    return freeSpaceBytes < triggerLimit * 1024 * 1024;
};

export const getFreeSpace = async (triggerLimit: number, dstPath: string) => {
    const stats = await fs.statfs(dstPath);
    const freeDiskSpaceBytes = stats.bfree * stats.bsize;
    const freeSpaceBytes = freeDiskSpaceBytes;
    return freeSpaceBytes - triggerLimit * 1024 * 1024;
};

export const remainingTime = (freeSpaceMB: number, samplesPerSecond: number) =>
    indexToTimestamp(freeSpaceMB / frameSize, samplesPerSecond);

export const canFileFit = async (
    triggerLimit: number,
    fileSizeBytes: number,
    dstPath: string
) => {
    const stats = await fs.statfs(dstPath);
    const freeDiskSpaceBytes =
        stats.bfree * stats.bsize - triggerLimit * 1024 * 1024;
    return freeDiskSpaceBytes >= fileSizeBytes;
};
