/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { options } from '../../globals';
import { deviceOpenedAction } from '../../reducers/appReducer';
import { fireEvent, render } from '../../utils/testUtils';
import SidePanel from '../SidePanel/SidePanel';

const ppk2_device_selected = [
    deviceOpenedAction('/dev/test/device', {
        ppkSetPowerMode: true,
        ppkSetUserGains: true,
        ppkSetSpikeFilter: true,
        ppkAverageStart: true,
        ppkTriggerSet: true,
        ppkTriggerStop: true,
        ppkTriggerSingleSet: true,
        ppkAverageStop: true,
        ppkDeviceRunning: true,
        ppkUpdateRegulator: true,
        maxContinuousSamplingTimeUs: 10,
        samplingTimeUs: 10,
        digitalChannels: true,
        prePostTriggering: true,
    }),
];

describe('SidePanel', () => {
    it('should have Load present at startup', () => {
        const screen = render(<SidePanel />);
        expect(screen.getByText('Load')).toBeDefined();
    });

    it('should not have LoadSave present at if the number of samples is zero', () => {
        const screen = render(<SidePanel />);
        expect(screen.queryByText('Save / Export')).toBeNull();
    });

    it('should have LoadSave present if the number of samples is non-zero', () => {
        options.index = 1;
        const screen = render(<SidePanel />);
        expect(screen.getByText('Save / Export')).toBeDefined();
    });

    it('successfully opens SaveChoiceDialog when clicking Save / Export button', () => {
        options.index = 1;
        const screen = render(<SidePanel />);

        const saveButton = screen.getByText('Save / Export');
        fireEvent.click(saveButton);

        expect(screen.getByText('What would you like to save?')).toBeDefined();
    });
});

describe('ChartOptions', () => {
    it('should initialize with default values', () => {
        const screen = render(<SidePanel />, ppk2_device_selected);
        expect(screen.getByText('Chart Options'));
        expect(screen.queryByText('10'));
        expect(screen.queryByText('0'));
    });
});
