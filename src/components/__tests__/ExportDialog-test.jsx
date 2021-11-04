/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { render, screen } from '../../utils/testUtils';
import ExportDialog from '../SaveExport/ExportDialog';

jest.mock('pc-nrfconnect-shared', () => ({
    getAppDataDir: () => '',
    Toggle: () => <></>,
}));

const initialState = {
    app: {
        chart: {
            windowBegin: 1,
            windowEnd: 1000000,
            cursorBegin: null,
            hasDigitalChannels: true,
        },
        app: {
            isExportDialogVisible: true,
        },
    },
};

describe('ExportDialog', () => {
    render(<ExportDialog />, { initialState });
    const numberOfRecordsText = '100000 records';
    const totalSizeLargerThanZeroPattern = /[1-9][0-9]*\sMB/;
    const durationLargerThanZeroPattern = /[1-9][0-9]*\ss/;

    it('should show the number of records', () => {
        const numberOfRecords = screen.getByText(numberOfRecordsText);
        expect(numberOfRecords).not.toBe(undefined);
        const totalSize = screen.getByText(totalSizeLargerThanZeroPattern);
        expect(totalSize).not.toBe(undefined);
        const duration = screen.getByText(durationLargerThanZeroPattern);
        expect(duration).not.toBe(undefined);
    });
});
