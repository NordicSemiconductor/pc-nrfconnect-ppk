/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { save } from '../../actions/fileActions';
import {
    appState,
    showExportDialog,
    toggleSaveChoiceDialog,
} from '../../slices/appSlice';

const Option = ({
    heading,
    content,
    onClick,
    buttonText,
}: {
    heading: string;
    content: React.ReactNode;
    onClick: () => void;
    buttonText: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="tw-group tw-h-full tw-w-full tw-text-gray-700"
    >
        <div className="tw-flex tw-flex-col tw-gap-2 tw-border tw-border-b-0 tw-border-gray-50 tw-px-4 tw-py-5 tw-text-left tw-text-sm">
            <b>{heading}</b>
            {content}
        </div>
        <div className="tw-flex tw-h-8 tw-w-full tw-flex-row tw-items-center tw-justify-center tw-border tw-border-gray-50 tw-bg-gray-50 tw-text-xs group-hover:tw-bg-primary group-hover:tw-text-white">
            {buttonText}
        </div>
    </button>
);

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
                <Option
                    heading="Save session data"
                    onClick={() => {
                        close();
                        dispatch(save());
                    }}
                    buttonText="SAVE TO .PPK2"
                    content={
                        <p>
                            When you want to reopen the data in this
                            application. PPK files are not supported by other
                            software.
                        </p>
                    }
                />
                <Option
                    heading="Export selected range"
                    onClick={() => {
                        close();
                        dispatch(showExportDialog());
                    }}
                    buttonText="EXPORT TO .CSV"
                    content={
                        <p>
                            When you want to use your data in other software.
                            CSV files are not supported by this application.
                        </p>
                    }
                />
            </div>
        </GenericDialog>
    );
};
