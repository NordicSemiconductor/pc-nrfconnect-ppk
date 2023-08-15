/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { deviceOpenedAction } from '../../slices/appSlice';
import {
    triggerLengthSetAction,
    triggerLevelSetAction,
    triggerWindowRangeAction,
} from '../../slices/triggerSlice';
import { fireEvent, render, screen } from '../../utils/testUtils';
import Trigger from '../SidePanel/Trigger/Trigger';

const TRIGGER_LENGTH = 10;

const initialStateActions = [
    // Set app State (app.app):
    deviceOpenedAction({
        portName: 'testPort',
        capabilities: { ppkTriggerExtToggle: false },
    }),
    // Set trigger State (app.trigger):
    triggerWindowRangeAction({ min: 1, max: 100 }),
    triggerLengthSetAction({ triggerLength: TRIGGER_LENGTH }),
    triggerLevelSetAction({ triggerLevel: 1000 }),
];

describe('Trigger', () => {
    it('should be possible to switch modes', () => {
        render(<Trigger />, initialStateActions);

        const singleButton = screen.getByText(/single/i);
        const continuousButton = screen.getByText(/continuous/i);
        expect(singleButton).toBeInTheDocument();
        expect(continuousButton).toBeInTheDocument();
        expect(singleButton).not.toHaveAttribute('disabled');
        expect(continuousButton).toHaveAttribute('disabled');
        fireEvent.click(singleButton);
        expect(singleButton).toHaveAttribute('disabled');
        expect(continuousButton).not.toHaveAttribute('disabled');
    });

    it('should update slider value if input field is changed, but only if the input is valid', () => {
        render(<Trigger />, initialStateActions);

        const triggerLengthInput = screen.getByText(/length/i).nextSibling;
        if (triggerLengthInput == null) {
            // Then something is wrong...
            expect(false).toBe(true);
        }
        const sliderValue = screen.getByRole('slider');
        expect(sliderValue.getAttribute('aria-valuenow')).toBe(
            `${TRIGGER_LENGTH}`
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        fireEvent.change(triggerLengthInput!, {
            target: { value: 'abc' },
        });
        expect(triggerLengthInput).toHaveClass('invalid');
        expect(sliderValue.getAttribute('aria-valuenow')).toBe(
            `${TRIGGER_LENGTH}`
        );
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        fireEvent.change(triggerLengthInput!, {
            target: { value: '15' },
        });
        expect(triggerLengthInput).not.toHaveClass('invalid');
        expect(sliderValue.getAttribute('aria-valuenow')).toBe('15');
    });
});
