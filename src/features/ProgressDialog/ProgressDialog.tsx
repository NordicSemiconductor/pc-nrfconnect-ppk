/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Alert,
    DialogButton,
    GenericDialog,
    useStopwatch,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { closeProgressDialog, getProgressDialogInfo } from './progressSlice';
import TimeComponent from './TimeComponent';

export default () => {
    const dispatch = useDispatch();
    const dialogInfo = useSelector(getProgressDialogInfo);
    const lastProgress = useRef(-1);

    const { time, reset, pause, start } = useStopwatch({
        autoStart: true,
        resolution: 1000,
    });

    useEffect(() => {
        if (!dialogInfo.show) {
            lastProgress.current = -1;
            pause();
        } else {
            start(0);
        }
    }, [dialogInfo.show, pause, start]);

    useEffect(() => {
        if (dialogInfo.progress < lastProgress.current) {
            lastProgress.current = dialogInfo.progress;
            reset();
        }
    }, [dialogInfo.progress, reset]);

    return (
        <GenericDialog
            title={dialogInfo.title}
            footer={
                <DialogButton
                    onClick={() => dispatch(closeProgressDialog())}
                    disabled={!dialogInfo.complete}
                >
                    Close
                </DialogButton>
            }
            isVisible={dialogInfo.show}
        >
            {dialogInfo.errorMessage ? (
                <Alert variant="danger">{dialogInfo.errorMessage}</Alert>
            ) : (
                <div className="tw-flex tw-w-full tw-flex-col tw-gap-2">
                    <div>
                        <span>{dialogInfo.message}</span>
                        <br />
                    </div>
                    <TimeComponent
                        time={time}
                        progress={dialogInfo.progress}
                        indeterminate={dialogInfo.indeterminate}
                    />
                </div>
            )}
        </GenericDialog>
    );
};
