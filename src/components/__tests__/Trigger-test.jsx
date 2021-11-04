/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { fireEvent, render, screen } from '../../utils/testUtils';
import Trigger from '../SidePanel/Trigger/Trigger';

const TRIGGER_LENGTH = 10;

const initialState = {
    app: {
        app: {
            rttRunning: true,
            capabilities: {
                ppkTriggerExtToggle: false,
            },
        },
        trigger: {
            externalTrigger: false,
            triggerWindowRange: {
                min: 1,
                max: 100,
            },
            triggerLength: TRIGGER_LENGTH,
            triggerLevel: 1000,
            triggerSingleWaiting: false,
            triggerRunning: false,
        },
    },
};

describe('Trigger', () => {
    beforeEach(() => {
        render(<Trigger />, {
            initialState,
        });
    });

    it('should be possible to switch modes', () => {
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
        const triggerLengthInput = screen.getByText(/length/i).nextSibling;
        const sliderValue = screen.getByRole('slider');
        expect(sliderValue.getAttribute('aria-valuenow')).toBe(
            `${TRIGGER_LENGTH}`
        );
        fireEvent.change(triggerLengthInput, {
            target: { value: 'abc' },
        });
        expect(triggerLengthInput).toHaveClass('invalid');
        expect(sliderValue.getAttribute('aria-valuenow')).toBe(
            `${TRIGGER_LENGTH}`
        );
        fireEvent.change(triggerLengthInput, {
            target: { value: '15' },
        });
        expect(triggerLengthInput).not.toHaveClass('invalid');
        expect(sliderValue.getAttribute('aria-valuenow')).toBe('15');
    });
});
