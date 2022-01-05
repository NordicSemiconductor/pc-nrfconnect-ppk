/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { options } from '../../globals';
import { showExportDialog } from '../../reducers/appReducer';

import {
    chartCursorAction,
    chartWindowAction,
} from '../../reducers/chartReducer';
import { fireEvent, render } from '../../utils/testUtils';
import ExportDialog from '../SaveExport/ExportDialog';

jest.mock('../../utils/persistentStore', () => ({
    getLastSaveDir: () => 'mocked/save/dir',
    getMaxBufferSize: () => 200,
    getVoltageRegulatorMaxCap: () => 5000,
    getDigitalChannels: () => [true,true,false,false,false,false,false,false],
    getDigitalChannelsVisible: () => true,
    getTimestampsVisible: () =>  false,
    getSpikeFilter: () => ({ samples: 3, alpha: 0.18, alpha5: 0.06 })
}));

const initialStateActions = [
    chartWindowAction(1, 1_000_000, 1_000_000),
    showExportDialog(),
]

describe('ExportDialog', () => {
    const totalSizeLargerThanZeroPattern = /[1-9][0-9]*\sMB/;
    const durationLargerThanZeroPattern = /[0-9][0-9]*\ss/;

    it('should show the number of records for the whole sample when exporting `All`', () => {
        const expectedNumberOfRecords = 2_000_000;
        const numberOfRecordsText = `${expectedNumberOfRecords} records`;

        options.index = expectedNumberOfRecords - 1; // Header + all samples
        const screen = render(<ExportDialog />, initialStateActions);
        
        const numberOfRecords = screen.getByText(numberOfRecordsText);
        expect(numberOfRecords).not.toBe(undefined);
        const totalSize = screen.getByText(totalSizeLargerThanZeroPattern);
        expect(totalSize).not.toBe(undefined);
        const duration = screen.getByText(durationLargerThanZeroPattern);
        expect(duration).not.toBe(undefined);
    })

    it('should show the number of records only inside the window', () => {
        const numberOfRecordsText = '100000 records';
        
        const screen = render(<ExportDialog />, initialStateActions);
        const radioWindow = screen.getByText('Window');
        fireEvent.click(radioWindow);

        const numberOfRecords = screen.getByText(numberOfRecordsText);
        expect(numberOfRecords).not.toBe(undefined);
        const totalSize = screen.getByText(totalSizeLargerThanZeroPattern);
        expect(totalSize).not.toBe(undefined);
        const duration = screen.getByText(durationLargerThanZeroPattern);
        expect(duration).not.toBe(undefined);
    });

    it('should open with the last option to export the selected area when area has been selected', () => {
        const numberOfRecordsText = '80000 records';
        
        const screen = render(<ExportDialog />, [
            chartCursorAction(1, 800000),
            ...initialStateActions,
            // Chart cursor uses timestamps, and the default sampling rate is 100_000 samples/sec
            // which means that there will be (0.8 - 0.000001) * 100_000 = 7999 samples + 1 header => 400 Records
        ]);

        const numberOfRecords = screen.getByText(numberOfRecordsText);
        expect(numberOfRecords).not.toBe(undefined);
        const totalSize = screen.getByText(totalSizeLargerThanZeroPattern);
        expect(totalSize).not.toBe(undefined);
        const duration = screen.getByText(durationLargerThanZeroPattern);
        expect(duration).not.toBe(undefined);
    });


});
