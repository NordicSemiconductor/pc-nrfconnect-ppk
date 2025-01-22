/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { useDispatch } from 'react-redux';
import {
    Alert,
    Button,
    ConfirmationDialog,
    DialogButton,
    GenericDialog,
    logger,
    useStopwatch,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { setSessionRecoveryPending } from '../../slices/appSlice';
import { formatDuration, formatTimestamp } from '../../utils/formatters';
import TimeComponent from '../ProgressDialog/TimeComponent';
import { RecoveryManager } from './RecoveryManager';
import {
    DeleteAllSessions,
    RemoveSessionByFilePath,
    Session,
} from './SessionsListFileHandler';

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
                    variant="secondary"
                    onClick={() => {
                        onRemoveClick(session);
                    }}
                >
                    Delete
                </Button>
                <Button
                    variant="primary"
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
    const dispatch = useDispatch();

    const recoveryManager = RecoveryManager.getInstance();

    const [isSessionsListDialogVisible, setIsSessionsListDialogVisible] =
        React.useState(false);
    const [orphanedSessions, setOrphanedSessions] = React.useState<Session[]>(
        []
    );

    const [isSearching, setIsSearching] = React.useState(false);
    const [sessionSearchProgress, setSessionSearchProgress] = React.useState(0);

    const [isRecovering, setIsRecovering] = React.useState(false);
    const [recoveryProgress, setRecoveryProgress] = React.useState(0);
    const [recoveryError, setRecoveryError] = React.useState<string | null>(
        null
    );

    const [confirmationDialogConfig, setConfirmationDialogConfig] = useState({
        isVisible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: () => {},
        onCancel: () => {},
    });

    const closeConfirmationDialog = () => {
        setConfirmationDialogConfig(c => ({
            ...c,
            isVisible: false,
        }));
    };

    const lastProgress = useRef(-1);

    const { time, reset, pause, start } = useStopwatch({
        autoStart: true,
        resolution: 1000,
    });

    const setRecoveryPending = (status: boolean) => {
        dispatch(setSessionRecoveryPending(status));
    };

    useEffect(() => {
        if (!isRecovering) {
            lastProgress.current = -1;
            pause();
        } else {
            start(0);
        }
    }, [isRecovering, pause, start]);

    useEffect(() => {
        if (recoveryProgress < lastProgress.current) {
            lastProgress.current = recoveryProgress;
            reset();
        }
    }, [recoveryProgress, reset]);

    useEffect(() => {
        recoveryManager.searchOrphanedSessions(
            () => {},
            (orphanSessions: Session[]) => {
                if (orphanSessions.length > 0) {
                    setConfirmationDialogConfig({
                        isVisible: true,
                        title: 'Recover Session',
                        message:
                            'There are sessions that were not properly closed on your system. Would you like to recover them?',
                        confirmText: 'Confirm',
                        cancelText: 'Cancel',
                        onConfirm: () => {
                            setIsSessionsListDialogVisible(true);
                            setIsSearching(true);
                            setSessionSearchProgress(0);
                            recoveryManager.searchOrphanedSessions(
                                (progress: number) => {
                                    setSessionSearchProgress(progress);
                                },
                                (sessions: Session[]) => {
                                    setIsSearching(false);
                                    setOrphanedSessions(sessions);
                                    if (sessions.length > 0) {
                                        setIsSessionsListDialogVisible(true);
                                    }
                                }
                            );
                            closeConfirmationDialog();
                        },
                        onCancel: () => {
                            closeConfirmationDialog();
                        },
                    });
                }
            },
            true
        );
    }, [recoveryManager]);

    return (
        <>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <>
                        <DialogButton
                            variant="secondary"
                            onClick={() => {
                                setIsSessionsListDialogVisible(false);
                            }}
                            disabled={isSearching}
                        >
                            Close
                        </DialogButton>
                        <DialogButton
                            variant="secondary"
                            onClick={() => {
                                setConfirmationDialogConfig({
                                    isVisible: true,
                                    title: 'Delete All Sessions',
                                    message:
                                        'Are you sure you want to delete all sessions? This action cannot be undone.',
                                    confirmText: 'Delete',
                                    cancelText: 'Cancel',
                                    onConfirm: () => {
                                        DeleteAllSessions(
                                            () => {},
                                            () => {
                                                closeConfirmationDialog();
                                                setOrphanedSessions([]);
                                            }
                                        );
                                    },
                                    onCancel: () => {
                                        closeConfirmationDialog();
                                    },
                                });
                            }}
                            disabled={
                                isSearching || orphanedSessions.length === 0
                            }
                        >
                            Delete All
                        </DialogButton>
                    </>
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
                        <ProgressBar
                            now={sessionSearchProgress}
                            style={{ height: '4px' }}
                            animated={false}
                        />
                    </>
                )}

                {!isSearching && (
                    <>
                        <div className="tw-mb-4">
                            The following sessions can be recovered:
                        </div>
                        <div className="core19-app tw-max-h-96 tw-overflow-y-auto tw-bg-white">
                            {ItemizedSessions({
                                orphanedSessions,
                                onRecoverClick: session => {
                                    setConfirmationDialogConfig({
                                        isVisible: true,
                                        title: 'Recover Session',
                                        message: `Do you want to recover the session? You will be able to recover the other sessions afterwards as well.`,
                                        confirmText: 'Recover',
                                        cancelText: 'Cancel',
                                        onConfirm: () => {
                                            closeConfirmationDialog();
                                            setIsRecovering(true);
                                            setIsSessionsListDialogVisible(
                                                false
                                            );
                                            dispatch(
                                                setSessionRecoveryPending(true)
                                            );
                                            setRecoveryProgress(0);
                                            setRecoveryError(null);
                                            reset();
                                            recoveryManager.recoverSession(
                                                session,
                                                (progress: number) => {
                                                    setRecoveryProgress(
                                                        progress
                                                    );
                                                },
                                                () => {
                                                    pause();
                                                    setRecoveryPending(false);
                                                },
                                                (error: Error) => {
                                                    pause();
                                                    setRecoveryPending(false);
                                                    setRecoveryError(
                                                        error.message
                                                    );
                                                    logger.error(error.message);
                                                },
                                                () => {
                                                    pause();
                                                    setRecoveryPending(false);
                                                }
                                            );
                                        },
                                        onCancel: () => {
                                            closeConfirmationDialog();
                                        },
                                    });
                                },
                                onRemoveClick: session => {
                                    setConfirmationDialogConfig({
                                        isVisible: true,
                                        title: 'Delete Session',
                                        message: `Are you sure you want to delete the session? This action cannot be undone.`,
                                        confirmText: 'Delete',
                                        cancelText: 'Cancel',
                                        onConfirm: () => {
                                            RemoveSessionByFilePath(
                                                session.filePath,
                                                () => {
                                                    const sessions =
                                                        orphanedSessions.filter(
                                                            s =>
                                                                s.filePath !==
                                                                session.filePath
                                                        );
                                                    setOrphanedSessions(
                                                        sessions
                                                    );
                                                    closeConfirmationDialog();
                                                }
                                            );
                                        },
                                        onCancel: () => {
                                            closeConfirmationDialog();
                                        },
                                    });
                                },
                            })}
                            {orphanedSessions.length === 0 && (
                                <div>No sessions found</div>
                            )}
                        </div>
                    </>
                )}
            </GenericDialog>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <DialogButton
                        variant="secondary"
                        onClick={() => {
                            if (!recoveryError) {
                                recoveryManager.cancelRecoveryProcess();
                            }
                            setIsRecovering(false);
                            setIsSessionsListDialogVisible(true);
                        }}
                    >
                        Cancel
                    </DialogButton>
                }
                isVisible={isRecovering}
            >
                <div className="tw-flex tw-w-full tw-flex-col tw-gap-2">
                    <div>
                        <span>
                            The session is being recovered. Please wait.
                        </span>
                        <br />
                    </div>
                    <TimeComponent
                        time={time}
                        progress={recoveryProgress}
                        indeterminate={false}
                    />
                    {recoveryError && (
                        <Alert variant="danger">{recoveryError}</Alert>
                    )}
                </div>
            </GenericDialog>
            <ConfirmationDialog
                title={confirmationDialogConfig.title}
                isVisible={confirmationDialogConfig.isVisible}
                confirmLabel={confirmationDialogConfig.confirmText}
                cancelLabel={confirmationDialogConfig.cancelText}
                onConfirm={confirmationDialogConfig.onConfirm}
                onCancel={confirmationDialogConfig.onCancel}
            >
                {confirmationDialogConfig.message}
            </ConfirmationDialog>
        </>
    );
};
