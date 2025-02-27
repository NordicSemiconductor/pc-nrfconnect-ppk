/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    addConfirmBeforeClose,
    Alert,
    Button,
    clearConfirmBeforeClose,
    ConfirmationDialog,
    DialogButton,
    GenericDialog,
    logger,
    useStopwatch,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    isSessionRecoveryPending,
    setSavePending,
} from '../../slices/appSlice';
import { formatDuration, formatTimestamp } from '../../utils/formatters';
import TimeComponent from '../ProgressDialog/TimeComponent';
import { RecoveryManager } from './RecoveryManager';
import {
    DeleteAllSessions,
    RemoveSessionByFilePath,
    Session,
    SessionFlag,
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
    <div className=" tw-flex tw-flex-row tw-justify-between tw-bg-gray-800 tw-p-3 tw-text-white">
        <div>
            <div className="tw-text-xs">Start time</div>
            <div>{formatTimestamp(session.startTime)}</div>
        </div>
        <div>
            <div className="tw-text-xs">Duration</div>
            <div>{formatDuration(session.samplingDuration || 0)}</div>
        </div>
        <div>
            <div className="tw-text-xs">Sampling rate</div>
            <div>{session.samplingRate}</div>
        </div>
        <div className="tw-content-center tw-align-middle">
            <div className="tw-flex tw-flex-row tw-gap-2">
                <Button
                    variant="secondary"
                    onClick={() => onRemoveClick(session)}
                >
                    Delete
                </Button>
                <Button
                    variant="primary"
                    onClick={() => onRecoverClick(session)}
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
                key={session.filePath}
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

    const pendingRecovery = useSelector(isSessionRecoveryPending);
    const [isSessionsListDialogVisible, setIsSessionsListDialogVisible] =
        useState(false);
    const [orphanedSessions, setOrphanedSessions] = useState<Session[]>([]);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryProgress, setRecoveryProgress] = useState(0);
    const [recoveryError, setRecoveryError] = useState<string | null>(null);
    const [confirmationDialogConfig, setConfirmationDialogConfig] = useState({
        isVisible: false,
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: () => {},
        onCancel: () => {},
    });

    const closeConfirmationDialog = () =>
        setConfirmationDialogConfig(c => ({ ...c, isVisible: false }));
    const lastProgress = useRef(-1);
    const { time, reset, pause, start } = useStopwatch({
        autoStart: true,
        resolution: 1000,
    });

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
        if (pendingRecovery) {
            dispatch(
                addConfirmBeforeClose({
                    id: 'sessionRecoveryInProgress',
                    message:
                        'There is a session recovery in progress. If you close the application, the progress will be lost and the session will remain in the recovery list. Are you sure you want to close?',
                })
            );
        } else {
            dispatch(clearConfirmBeforeClose('sessionRecoveryInProgress'));
        }
    }, [dispatch, pendingRecovery]);

    useEffect(() => {
        recoveryManager.searchOrphanedSessions(
            () => {},
            (orphanSessions: Session[]) => {
                if (orphanSessions.length > 0) {
                    setOrphanedSessions(orphanSessions);
                    setIsSessionsListDialogVisible(true);
                }
            }
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
                            onClick={() =>
                                setIsSessionsListDialogVisible(false)
                            }
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
                                    onCancel: closeConfirmationDialog,
                                });
                            }}
                            disabled={orphanedSessions.length === 0}
                        >
                            Delete All
                        </DialogButton>
                    </>
                }
                isVisible={isSessionsListDialogVisible}
                closeOnEsc
                closeOnUnfocus
            >
                <>
                    <div className="tw-mb-4">
                        The following sampling sessions did not close properly
                        and can be recovered:
                    </div>
                    <div className="core19-app tw-max-h-96 tw-overflow-y-auto tw-bg-white">
                        <ItemizedSessions
                            orphanedSessions={orphanedSessions}
                            onRecoverClick={session => {
                                setIsSessionsListDialogVisible(false);
                                if (session.flag === SessionFlag.Recovered) {
                                    dispatch(
                                        RecoveryManager.renderSessionData(
                                            session
                                        )
                                    );
                                    dispatch(setSavePending(true));
                                    return;
                                }
                                setIsRecovering(true);
                                setRecoveryProgress(0);
                                setRecoveryError(null);
                                reset();

                                dispatch(
                                    recoveryManager.recoverSession(
                                        session,
                                        (progress: number) =>
                                            setRecoveryProgress(progress),
                                        () => {
                                            pause();
                                            setIsRecovering(false);
                                            dispatch(setSavePending(true));
                                        },
                                        (error: Error) => {
                                            pause();
                                            setRecoveryError(error.message);
                                            logger.error(error.message);
                                        },
                                        pause
                                    )
                                );
                            }}
                            onRemoveClick={session => {
                                setConfirmationDialogConfig({
                                    isVisible: true,
                                    title: 'Delete Session',
                                    message:
                                        'Are you sure you want to delete the session? This action cannot be undone.',
                                    confirmText: 'Delete',
                                    cancelText: 'Cancel',
                                    onConfirm: () => {
                                        RemoveSessionByFilePath(
                                            session.filePath,
                                            () => {
                                                setOrphanedSessions(
                                                    orphanedSessions.filter(
                                                        s =>
                                                            s.filePath !==
                                                            session.filePath
                                                    )
                                                );
                                                closeConfirmationDialog();
                                            }
                                        );
                                    },
                                    onCancel: closeConfirmationDialog,
                                });
                            }}
                        />
                        {orphanedSessions.length === 0 && (
                            <div>No sessions found</div>
                        )}
                    </div>
                </>
            </GenericDialog>
            <GenericDialog
                className="tw-preflight tw-max-h-screen"
                title="Session Recovery"
                footer={
                    <DialogButton
                        variant="secondary"
                        onClick={() => {
                            if (!recoveryError)
                                recoveryManager.cancelRecoveryProcess();
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
