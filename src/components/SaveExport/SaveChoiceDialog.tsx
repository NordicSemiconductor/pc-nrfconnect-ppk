/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { save } from '../../actions/fileActions';
import {
    appState,
    showExportDialog,
    toggleSaveChoiceDialog,
} from '../../slices/appSlice';

export default () => {
    const dispatch = useDispatch();
    const { isSaveChoiceDialogVisible } = useSelector(appState);

    const close = () => dispatch(toggleSaveChoiceDialog());

    return (
        <GenericDialog
            className="tw-preflight"
            title="What would you like to save?"
            footer={
                <DialogButton variant="secondary" onClick={close}>
                    Close
                </DialogButton>
            }
            isVisible={isSaveChoiceDialogVisible}
            onHide={close}
        >
            <div className="tw-flex tw-flex-row tw-gap-4">
                <div className="tw-h-full tw-w-full">
                    <div className="tw-flex tw-flex-col tw-gap-2 tw-border tw-border-b-0 tw-border-gray-200 tw-p-4">
                        <p className=" tw-pt-8 tw-text-xs tw-uppercase tw-tracking-widest tw-text-gray-400">
                            Save session data
                        </p>
                        <p>
                            Great if you want to view the data again in this
                            application. Not usable by other software.
                        </p>
                        <p>.PPK</p>
                    </div>
                    <div>
                        <Button
                            variant="secondary"
                            size="lg"
                            className="tw-w-full"
                            onClick={() => {
                                close();
                                dispatch(save());
                            }}
                        >
                            SAVE
                        </Button>
                    </div>
                </div>

                <div className="tw-h-full tw-w-full">
                    <div className="tw-flex tw-flex-col tw-gap-2 tw-border tw-border-b-0 tw-border-gray-200 tw-p-4">
                        <p className=" tw-pt-8 tw-text-xs tw-uppercase tw-tracking-widest tw-text-gray-400">
                            Export selected range
                        </p>
                        <p>
                            Great if you want to manipulate your data in other
                            software. Can not be opened by this application.
                        </p>
                        <p>.CSV</p>
                    </div>
                    <div>
                        <Button
                            variant="secondary"
                            className="tw-w-full"
                            size="lg"
                            onClick={() => {
                                close();
                                dispatch(showExportDialog());
                            }}
                        >
                            EXPORT
                        </Button>
                    </div>
                </div>
            </div>
        </GenericDialog>
    );
};
