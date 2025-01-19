/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
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
    const [isSessionsFoundDialogVisible, setIsSessionsFoundDialogVisible] =
        React.useState(false);
    const [isSessionsListDialogVisible, setIsSessionsListDialogVisible] =
        React.useState(false);
    const [orphanedSessions, setOrphanedSessions] = React.useState<Session[]>(
        []
    );

    const [isSearching, setIsSearching] = React.useState(false);
    const [sessionSearchProgress, setSessionSearchProgress] = React.useState(0);

    useEffect(() => {
        RecoveryManager().searchOrphanedSessions(
            () => {},
            (orphanSessions: Session[]) => {
                if (orphanSessions.length > 0) {
                    setIsSessionsFoundDialogVisible(true);
                }
            },
            true
        );
    }, []);

    return (
        <>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <>
                        <DialogButton
                            variant="success"
                            onClick={() => {
                                setIsSessionsFoundDialogVisible(false);
                                setIsSessionsListDialogVisible(true);
                                setIsSearching(true);
                                RecoveryManager().searchOrphanedSessions(
                                    (progress: number) => {
                                        setSessionSearchProgress(progress);
                                    },
                                    (orphanSessions: Session[]) => {
                                        setIsSearching(false);
                                        setOrphanedSessions(orphanSessions);
                                        if (orphanSessions.length > 0) {
                                            setIsSessionsListDialogVisible(
                                                true
                                            );
                                        }
                                    }
                                );
                            }}
                        >
                            Yes
                        </DialogButton>
                        <DialogButton
                            variant="danger"
                            onClick={() => {
                                setIsSessionsFoundDialogVisible(false);
                            }}
                        >
                            No
                        </DialogButton>
                    </>
                }
                isVisible={isSessionsFoundDialogVisible}
                closeOnEsc
                closeOnUnfocus
            >
                <div>
                    There are orphaned sessions found. Would you like to recover
                    some of them?
                </div>
            </GenericDialog>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <DialogButton
                        variant="secondary"
                        onClick={() => {
                            setIsSessionsListDialogVisible(false);
                        }}
                        disabled={isSearching}
                    >
                        Close
                    </DialogButton>
                }
                isVisible={isSessionsListDialogVisible}
                closeOnEsc
                closeOnUnfocus
            >
                {isSearching && (
                    <>
                        <div>
                            We are searching for oephaned sessions on your
                            system. Please wait.
                        </div>
                        <ProgressBar now={sessionSearchProgress} animated />
                    </>
                )}

                {!isSearching && (
                    <>
                        <div>
                            The following orphan sessions were found. Whould you
                            like to recover?
                        </div>
                        <div className="core19-app tw-flex tw-max-h-96 tw-flex-col tw-gap-1 tw-overflow-y-auto">
                            <ItemizedOption
                                orphanedSessions={orphanedSessions}
                            />
                        </div>
                    </>
                )}
            </GenericDialog>
        </>
    );
};
