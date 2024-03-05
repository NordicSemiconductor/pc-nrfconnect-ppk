/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    ConfirmationDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { load, screenshot } from '../../actions/fileActions';
import { DataManager } from '../../globals';
import {
    isSamplingRunning,
    isSavePending,
    toggleSaveChoiceDialog,
} from '../../slices/appSlice';
import { setDoNotAskStartAndClear } from '../../utils/persistentStore';
import ExportDialog from '../SaveExport/ExportDialog';
import SaveChoiceDialog from '../SaveExport/SaveChoiceDialog';

export const Load = () => {
    const dispatch = useDispatch();

    const savePending = useSelector(isSavePending);
    const [loading, setLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    return (
        <>
            <Button
                variant="secondary"
                title="Large files may take a while to process"
                className={`tw-w-full ${loading ? 'active-animation' : ''}`}
                onClick={() => {
                    if (savePending) {
                        setShowDialog(true);
                        return;
                    }

                    dispatch(load(setLoading));
                }}
                disabled={loading}
            >
                Load
            </Button>
            <ConfirmationDialog
                confirmLabel="Yes"
                cancelLabel="No"
                onConfirm={() => {
                    setShowDialog(false);
                    dispatch(load(setLoading));
                }}
                onCancel={() => {
                    setShowDialog(false);
                }}
                onOptional={() => {
                    setShowDialog(false);
                    setDoNotAskStartAndClear(true);
                    dispatch(load(setLoading));
                }}
                optionalLabel="Yes, don't ask again"
                isVisible={showDialog}
            >
                You have unsaved data and this will be lost. Are you sure you
                want to proceed loading a new file?
            </ConfirmationDialog>
        </>
    );
};

export const Save = () => {
    const dispatch = useDispatch();
    const samplingRunning = useSelector(isSamplingRunning);

    const disabled = samplingRunning || DataManager().getTimestamp() === 0;

    return (
        <>
            <div className="tw-flex tw-flex-col tw-gap-2">
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
            </div>
            <SaveChoiceDialog />
            <ExportDialog />
        </>
    );
};
