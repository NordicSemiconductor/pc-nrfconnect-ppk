/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';

import { load, screenshot } from '../../actions/fileActions';
import { appState, toggleSaveChoiceDialog } from '../../reducers/appReducer';
import { triggerState } from '../../reducers/triggerReducer';
import ExportDialog from '../SaveExport/ExportDialog';
import SaveChoiceDialog from '../SaveExport/SaveChoiceDialog';

export const Load = () => {
    const dispatch = useDispatch();

    const [loading, setLoading] = useState(false);

    return (
        <Button
            title="Large files may take a while to process"
            className={`w-100 secondary-btn ${loading && 'active-anim'}`}
            variant="set"
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
