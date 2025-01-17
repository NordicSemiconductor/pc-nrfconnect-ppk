/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    Button,
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { RecoveryManager } from './RecoveryManager';
import { Session } from './SessionsListFileHandler';

const Option = ({
    onClick,
    buttonText,
}: {
    onClick: () => void;
    buttonText: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="tw-group tw-h-full tw-w-full tw-text-gray-700"
    >
        <div className="tw-flex tw-h-8 tw-w-full tw-flex-row tw-items-center tw-border tw-border-gray-50 tw-bg-gray-50 tw-ps-3 tw-text-xs group-hover:tw-bg-primary group-hover:tw-text-white">
            {buttonText}
        </div>
    </button>
);

const ItemizedOption = ({
    orphanedSessions,
}: {
    orphanedSessions: Session[];
}) => (
    <div className="tw-flex tw-flex-col tw-gap-1">
        {orphanedSessions.map(session => (
            <Option
                key={
                    session.directory + Math.random().toString(36).substr(2, 9)
                }
                onClick={() => {}}
                buttonText={session.directory}
            />
        ))}
    </div>
);

export default () => {
    const [isDialogVisible, setIsDialogVisible] = React.useState(false);
    const [orphanedSessions, setOrphanedSessions] = React.useState<Session[]>(
        []
    );

    return (
        <>
            <Button
                variant="secondary"
                onClick={() => {
                    RecoveryManager().searchOrphanedSessions(
                        (progress: number) => {
                            console.log(progress);
                        },
                        (orphanSessions: Session[]) => {
                            console.log('Completed');
                            setOrphanedSessions(orphanSessions);
                            if (orphanSessions.length > 0) {
                                setIsDialogVisible(true);
                            }
                        }
                    );
                }}
            >
                There are orphaned sessions. Click to recover.
            </Button>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <DialogButton
                        variant="secondary"
                        onClick={() => {
                            setIsDialogVisible(false);
                        }}
                    >
                        Close
                    </DialogButton>
                }
                isVisible={isDialogVisible}
                closeOnEsc
                closeOnUnfocus
            >
                <div className="tw-mb-3">
                    The following orphan sessions were found. Whould you like to
                    recover?
                </div>
                <div className="core19-app tw-flex tw-max-h-96 tw-flex-col tw-gap-1 tw-overflow-y-auto">
                    <ItemizedOption orphanedSessions={orphanedSessions} />
                </div>
            </GenericDialog>
        </>
    );
};
