/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';

import { load, screenshot } from '../../actions/fileActions';
import { appState, toggleSaveChoiceDialog } from '../../reducers/appReducer';
import { triggerState } from '../../reducers/triggerReducer';
import ExportDialog from '../SaveExport/ExportDialog';
import SaveChoiceDialog from '../SaveExport/SaveChoiceDialog';

export const Load = () => {
    const dispatch = useDispatch();

    return (
        <Button
            className="w-100 secondary-btn"
            variant="set"
            onClick={() => dispatch(load())}
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
            <div className="save-load-btn-group">
                <Button
                    className="w-100 secondary-btn"
                    title={
                        disabled ? 'Stop sampling to save or export' : undefined
                    }
                    variant="set"
                    disabled={disabled}
                    onClick={() => dispatch(toggleSaveChoiceDialog())}
                >
                    Save / Export
                </Button>
                <Button
                    className="w-100 screenshot-btn secondary-btn"
                    variant="set"
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
