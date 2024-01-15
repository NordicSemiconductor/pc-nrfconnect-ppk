/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

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
