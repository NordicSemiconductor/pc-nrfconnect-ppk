/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import ProgressBar from 'react-bootstrap/ProgressBar';
import {
    Button,
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { formatDuration, formatTimestamp } from '../../utils/formatters';
import { RecoveryManager } from './RecoveryManager';
import { Session } from './SessionsListFileHandler';

const SessionItem = ({
    session,
    setIsRecovering,
    setIsSessionsListDialogVisible,
    setRecoveryProgress,
}: {
    session: Session;
    setIsRecovering: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSessionsListDialogVisible: React.Dispatch<
        React.SetStateAction<boolean>
    >;
    setRecoveryProgress: React.Dispatch<React.SetStateAction<number>>;
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
                <Button variant="danger" onClick={() => {}}>
                    Delete
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => {
                        setIsSessionsListDialogVisible(false);
                        setIsRecovering(true);
                        RecoveryManager().recoverSession(
                            session,
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
    setIsRecovering,
    setIsSessionsListDialogVisible,
    setRecoveryProgress,
}: {
    orphanedSessions: Session[];
    setIsRecovering: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSessionsListDialogVisible: React.Dispatch<
        React.SetStateAction<boolean>
    >;
    setRecoveryProgress: React.Dispatch<React.SetStateAction<number>>;
}) => (
    <div className="tw-flex tw-flex-col tw-gap-2">
        {orphanedSessions.map(session => (
            <SessionItem
                key={Math.random().toString(36)}
                session={session}
                setIsRecovering={setIsRecovering}
                setIsSessionsListDialogVisible={setIsSessionsListDialogVisible}
                setRecoveryProgress={setRecoveryProgress}
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
                                setSessionSearchProgress(0);
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
                            We are searching for oephaned sessions on your
                            system. Please wait.
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
                                setIsRecovering,
                                setIsSessionsListDialogVisible,
                                setRecoveryProgress,
                            })}
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
                            setIsRecovering(false);
                        }}
                    >
                        Cancel
                    </DialogButton>
                }
                isVisible={isRecovering}
            >
                <div className="tw-mb-4">
                    The following orphan sessions were found. Whould you like to
                    recover?
                </div>
                <ProgressBar now={recoveryProgress} />
            </GenericDialog>
        </>
    );
};
