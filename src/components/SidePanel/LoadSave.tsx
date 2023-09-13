/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Group } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { load, screenshot } from '../../actions/fileActions';
import { appState, toggleSaveChoiceDialog } from '../../slices/appSlice';
import { triggerState } from '../../slices/triggerSlice';
import ExportDialog from '../SaveExport/ExportDialog';
import SaveChoiceDialog from '../SaveExport/SaveChoiceDialog';

export const Load = () => {
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(false);

    return (
        <Button
            variant="secondary"
            title="Large files may take a while to process"
            className={`tw-w-full ${loading ? 'active-animation' : ''}`}
            onClick={() => dispatch(load(setLoading))}
            disabled={loading}
        >
            Load
        </Button>
    );
};

export const Save = () => {
    const dispatch = useDispatch();
    const { samplingRunning } = useSelector(appState);
    const { triggerSingleWaiting, triggerRunning } = useSelector(triggerState);

    const disabled = samplingRunning || triggerSingleWaiting || triggerRunning;

    return (
        <>
            <Group>
                <Button
                    className="w-100"
                    title={
                        disabled ? 'Stop sampling to save or export' : undefined
                    }
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => dispatch(toggleSaveChoiceDialog())}
                >
                    Save / Export
                </Button>
                <Button
                    className="w-100"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => dispatch(screenshot())}
                >
                    Screenshot
                </Button>
            </Group>
            <SaveChoiceDialog />
            <ExportDialog />
        </>
    );
};
