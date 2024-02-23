/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    ConfirmationDialog,
    Group,
    StartStopButton,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { unit } from 'mathjs';

import { samplingStart, samplingStop } from '../../actions/deviceActions';
import { DataManager } from '../../globals';
import {
    appState,
    getDiskFullTrigger,
    getSessionRootFolder,
    isSavePending,
} from '../../slices/appSlice';
import {
    getRecordingMode,
    resetChartTime,
    resetCursor,
} from '../../slices/chartSlice';
import { dataLoggerState } from '../../slices/dataLoggerSlice';
import {
    getAutoExportTrigger,
    resetTriggerOrigin,
    setTriggerSavePath,
} from '../../slices/triggerSlice';
import { convertTimeToSeconds, formatDuration } from '../../utils/duration';
import {
    calcFileSize,
    getFreeSpace,
    remainingTime as calcRemainingTime,
    selectDirectoryDialog,
} from '../../utils/fileUtils';
import { isDataLoggerPane, isScopePane } from '../../utils/panes';
import {
    getDoNotAskStartAndClear,
    setDoNotAskStartAndClear,
} from '../../utils/persistentStore';
import LiveModeSettings from './LiveModeSettings';
import SessionSettings from './SessionSettings';
import TriggerSettings from './TriggerSettings';

const fmtOpts = { notation: 'fixed' as const, precision: 1 };

const calcFileSizeString = (sampleFreq: number, durationSeconds: number) => {
    const bytes = sampleFreq * durationSeconds * 6;
    return calcFileSize(bytes, fmtOpts);
};

export default () => {
    const dispatch = useDispatch();
    const scopePane = useSelector(isScopePane);
    const autoExport = useSelector(getAutoExportTrigger);
    const dataLoggerPane = useSelector(isDataLoggerPane);
    const recordingMode = useSelector(getRecordingMode);
    const { samplingRunning } = useSelector(appState);
    const { sampleFreq, duration, durationUnit } = useSelector(dataLoggerState);
    const savePending = useSelector(isSavePending);
    const sessionFolder = useSelector(getSessionRootFolder);
    const diskFullTrigger = useSelector(getDiskFullTrigger);

    const sampleIndefinitely = durationUnit === 'inf';

    const startButtonTooltip = `Start sampling at ${unit(sampleFreq, 'Hz')
        .format(fmtOpts)
        .replace('.0', '')}`;

    const startStopTitle = !samplingRunning ? startButtonTooltip : undefined;

    const [showDialog, setShowDialog] = useState(false);

    const startAndClear = async () => {
        if (scopePane && autoExport) {
            const filePath = await selectDirectoryDialog();
            dispatch(setTriggerSavePath(filePath));
        }

        await DataManager().reset();
        dispatch(resetChartTime());
        dispatch(resetTriggerOrigin());
        dispatch(resetCursor());

        telemetry.sendEvent('StartSampling', {
            mode: recordingMode,
            samplesPerSecond: DataManager().getSamplesPerSecond(),
        });
        dispatch(samplingStart());
        setShowDialog(false);
    };

    const [freeSpace, setFreeSpace] = useState<number>(0);

    useEffect(() => {
        if (!dataLoggerPane) return;

        const action = () => {
            getFreeSpace(diskFullTrigger, sessionFolder).then(space => {
                setFreeSpace(space);
            });
        };
        action();
        const timerId = setInterval(action, 5000);
        return () => {
            clearInterval(timerId);
        };
    }, [dataLoggerPane, diskFullTrigger, sessionFolder]);

    const [remainingTime, setRemainingTime] = useState<number>(0);

    useEffect(() => {
        setRemainingTime(calcRemainingTime(freeSpace, sampleFreq));
    }, [freeSpace, sampleFreq]);

    return (
        <>
            <Group heading="Sampling parameters">
                <div className="tw-flex tw-flex-col tw-gap-4">
                    {dataLoggerPane && <LiveModeSettings />}
                    {scopePane && <TriggerSettings />}
                </div>
            </Group>
            <div className="tw-flex tw-flex-col tw-gap-2">
                <StartStopButton
                    title={startStopTitle}
                    startText="Start"
                    stopText="Stop"
                    onClick={async () => {
                        if (samplingRunning) {
                            dispatch(samplingStop());
                            telemetry.sendEvent('StopSampling', {
                                mode: recordingMode,
                                duration: DataManager().getTimestamp(),
                            });
                            return;
                        }

                        if (
                            DataManager().getTimestamp() > 0 &&
                            !getDoNotAskStartAndClear(false) &&
                            savePending
                        ) {
                            setShowDialog(true);
                        } else {
                            await startAndClear();
                        }
                    }}
                    showIcon
                    variant="secondary"
                    started={samplingRunning}
                />
                {dataLoggerPane && (
                    <div className="tw-border tw-border-solid tw-border-gray-400 tw-p-2 tw-text-[10px] tw-text-gray-400">
                        {!sampleIndefinitely && (
                            <div>
                                {`Estimated disk space required ${calcFileSizeString(
                                    sampleFreq,
                                    convertTimeToSeconds(duration, durationUnit)
                                )}. Current Available space ${calcFileSize(
                                    freeSpace
                                )}`}
                            </div>
                        )}
                        {sampleIndefinitely && (
                            <div>
                                {`Estimated space limit ${formatDuration(
                                    remainingTime
                                )} at ${calcFileSizeString(
                                    sampleFreq,
                                    convertTimeToSeconds(1, 'h')
                                )}/h. Available disk space ${calcFileSize(
                                    freeSpace
                                )}`}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {dataLoggerPane && <SessionSettings />}
            <ConfirmationDialog
                confirmLabel="Yes"
                cancelLabel="No"
                onConfirm={startAndClear}
                onCancel={() => {
                    setShowDialog(false);
                }}
                onOptional={async () => {
                    setDoNotAskStartAndClear(true);
                    await startAndClear();
                }}
                optionalLabel="Yes, don't ask again"
                isVisible={showDialog}
            >
                You have unsaved data and this will be lost. Are you sure you
                want to proceed?
            </ConfirmationDialog>
        </>
    );
};
