/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
    Button,
    ConfirmationDialog,
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { formatDuration, formatTimestamp } from '../../utils/formatters';
import { RecoveryManager } from './RecoveryManager';
import { Session } from './SessionsListFileHandler';

const SessionItem = ({
    session,
    onRecoverClick,
    onRemoveClick,
}: {
    session: Session;
    onRecoverClick: (session: Session) => void;
    onRemoveClick: (session: Session) => void;
}) => (
    <div className="tw-flex tw-flex-row tw-justify-between tw-bg-gray-800 tw-p-3 tw-text-white">
        <div>
            <div className="tw-text-xs">Start time</div>
            <div>{formatTimestamp(session.startTime)}</div>
        </div>
        <div>
            <div className="tw-text-xs">Duration</div>
            <div>
                {formatDuration(
                    session.samplingDuration ? session.samplingDuration : 0
                )}
            </div>
        </div>
        <div>
            <div className="tw-text-xs">Sampling rate</div>
            <div>{session.samplingRate}</div>
        </div>
        <div className="tw-content-center tw-align-middle">
            <div className="tw-flex tw-flex-row tw-gap-2">
                <Button
                    variant="danger"
                    onClick={() => {
                        onRemoveClick(session);
                    }}
                >
                    Delete
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => {
                        onRecoverClick(session);
                    }}
                >
                    Recover
                </Button>
            </div>
        </div>
    </div>
);

const ItemizedSessions = ({
    orphanedSessions,
    onRecoverClick,
    onRemoveClick,
}: {
    orphanedSessions: Session[];
    onRecoverClick: (session: Session) => void;
    onRemoveClick: (session: Session) => void;
}) => (
    <div className="tw-flex tw-flex-col tw-gap-2">
        {orphanedSessions.map(session => (
            <SessionItem
                key={Math.random().toString(36)}
                session={session}
                onRecoverClick={onRecoverClick}
                onRemoveClick={onRemoveClick}
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

    const [isConfirmationDialogVisible, setIsConfirmationDialogVisible] =
        React.useState(false);
    const [sessionToRecover, setSessionToRecover] =
        React.useState<Session | null>(null);

    const [isRecovering, setIsRecovering] = React.useState(false);
    const [recoveryProgress, setRecoveryProgress] = React.useState(0);

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
            <ConfirmationDialog
                title="Recover Session"
                isVisible={isSessionsFoundDialogVisible}
                onConfirm={() => {
                    setIsSessionsFoundDialogVisible(false);
                    setIsSessionsListDialogVisible(true);
                    setIsSearching(true);
                    setSessionSearchProgress(0);
                    RecoveryManager().searchOrphanedSessions(
                        (progress: number) => {
                            setSessionSearchProgress(progress);
                        },
                        (orphanSessions: Session[]) => {
                            setIsSearching(false);
                            setOrphanedSessions(orphanSessions);
                            if (orphanSessions.length > 0) {
                                setIsSessionsListDialogVisible(true);
                            }
                        }
                    );
                }}
                onCancel={() => {
                    setIsSessionsFoundDialogVisible(false);
                }}
            >
                <div>
                    There are sessions that were not properly closed on your
                    system. Would you like to recover them?
                </div>
            </ConfirmationDialog>
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
                        Cancel
                    </DialogButton>
                }
                isVisible={isSessionsListDialogVisible}
                closeOnEsc
                closeOnUnfocus
            >
                {isSearching && (
                    <>
                        <div>
                            Searching for sessions that can be recovered. Please
                            wait.
                        </div>
                        <ProgressBar now={sessionSearchProgress} />
                    </>
                )}

                {!isSearching && (
                    <>
                        <div className="tw-mb-4">
                            The following orphan sessions were found. Whould you
                            like to recover?
                        </div>
                        <div className="core19-app tw-max-h-96 tw-overflow-y-auto tw-bg-white">
                            {ItemizedSessions({
                                orphanedSessions,
                                onRecoverClick: session => {
                                    setSessionToRecover(session);
                                    setIsConfirmationDialogVisible(true);
                                },
                                onRemoveClick: () => {},
                            })}
                        </div>
                    </>
                )}
            </GenericDialog>
            <ConfirmationDialog
                title="Recover Session"
                isVisible={isConfirmationDialogVisible}
                onConfirm={() => {
                    setIsConfirmationDialogVisible(false);
                    setIsSessionsListDialogVisible(false);
                    setIsRecovering(true);

                    if (sessionToRecover) {
                        RecoveryManager().recoverSession(
                            sessionToRecover,
                            (progress: number) => {
                                setRecoveryProgress(progress);
                            },
                            () => {
                                console.log('Recovery complete');
                            },
                            (error: Error) => {
                                console.error('Recovery error:', error);
                            }
                        );
                    }
                }}
                onCancel={() => {
                    setIsConfirmationDialogVisible(false);
                }}
            >
                <div>
                    Do you want to recover the session started at{' '}
                    {formatTimestamp(
                        sessionToRecover?.startTime
                            ? sessionToRecover.startTime
                            : 0
                    )}
                    ?
                </div>
                <div>
                    You will be able to recover the other sessions afterwards as
                    well.
                </div>
            </ConfirmationDialog>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <DialogButton
                        variant="secondary"
                        onClick={() => {
                            setIsRecovering(false);
                        }}
                    >
                        Cancel
                    </DialogButton>
                }
                isVisible={isRecovering}
            >
                <div className="tw-mb-4">
                    The session is being recovered. Please wait.
                </div>
                <ProgressBar now={recoveryProgress} />
            </GenericDialog>
        </>
    );
};
