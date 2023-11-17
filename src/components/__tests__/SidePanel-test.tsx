/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { fireEvent, render, screen } from '../../utils/testUtils';
import SidePanel from '../SidePanel/SidePanel';

describe('SidePanel', () => {
    it('should have Load present at startup', () => {
        render(<SidePanel />);
        expect(screen.getByText('Load')).toBeDefined();
    });

    it('should not have LoadSave present at if the number of samples is zero', () => {
        render(<SidePanel />);
        expect(screen.queryByText('Save / Export')).toBeNull();
    });

    it('should have LoadSave present if the number of samples is non-zero', () => {
        // DataManager().getTotalSavedRecords() = 1 // TODO Mock This
        render(<SidePanel />);
        expect(screen.getByText('Save / Export')).toBeDefined();
    });

    it('successfully opens SaveChoiceDialog when clicking Save / Export button', () => {
        // DataManager().getTotalSavedRecords() = 1 // TODO Mock This
        render(<SidePanel />);

        const saveButton = screen.getByText('Save / Export');
        fireEvent.click(saveButton);

        expect(screen.getByText('What would you like to save?')).toBeDefined();
    });
});
