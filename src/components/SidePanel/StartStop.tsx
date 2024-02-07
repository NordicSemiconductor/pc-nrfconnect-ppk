/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import {
    ConfirmationDialog,
    Group,
    Slider,
    StartStopButton,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { unit } from 'mathjs';

import { samplingStart, samplingStop } from '../../actions/deviceActions';
import { DataManager } from '../../globals';
import { appState, isSavePending } from '../../slices/appSlice';
import { resetChartTime, resetCursor } from '../../slices/chartSlice';
import {
    dataLoggerState,
    updateSampleFreqLog10,
} from '../../slices/dataLoggerSlice';
import {
    getAutoExportTrigger,
    resetTriggerOrigin,
    setTriggerSavePath,
} from '../../slices/triggerSlice';
import { selectDirectoryDialog } from '../../utils/fileUtils';
import { isDataLoggerPane, isRealTimePane } from '../../utils/panes';
import {
    getDoNotAskStartAndClear,
    setDoNotAskStartAndClear,
} from '../../utils/persistentStore';
import LiveModeSettings from './LiveModeSettings';
import TriggerSettings from './TriggerSettings';

const fmtOpts = { notation: 'fixed' as const, precision: 1 };

export default () => {
    const dispatch = useDispatch();
    const realTimePane = useSelector(isRealTimePane);
    const autoExport = useSelector(getAutoExportTrigger);
    const dataLoggerPane = useSelector(isDataLoggerPane);
    const { samplingRunning } = useSelector(appState);
    const { sampleFreqLog10, sampleFreq, maxFreqLog10 } =
        useSelector(dataLoggerState);
    const savePending = useSelector(isSavePending);

    const startButtonTooltip = `Start sampling at ${unit(sampleFreq, 'Hz')
        .format(fmtOpts)
        .replace('.0', '')}`;

    const startStopTitle = !samplingRunning ? startButtonTooltip : undefined;

    const [showDialog, setShowDialog] = useState(false);

    const startAndClear = async () => {
        if (realTimePane && autoExport) {
            const filePath = await selectDirectoryDialog();
            dispatch(setTriggerSavePath(filePath));
        }

        await DataManager().reset();
        dispatch(resetChartTime());
        dispatch(resetTriggerOrigin());
        dispatch(resetCursor());

        dispatch(samplingStart());
        setShowDialog(false);
    };

    return (
        <>
            <Group heading="Sampling parameters">
                {dataLogger && <LiveModeSettings />}
                {realTime && <TriggerSettings />}
                <div className="sample-frequency-group">
                    <Form.Label htmlFor="data-logger-sampling-frequency">
                        {sampleFreq.toLocaleString('en')} samples per second
                    </Form.Label>
                    <Slider
                        ticks
                        id="data-logger-sampling-frequency"
                        values={[sampleFreqLog10]}
                        range={{ min: 0, max: maxFreqLog10 }}
                        onChange={[
                            v =>
                                dispatch(
                                    updateSampleFreqLog10({
                                        sampleFreqLog10: v,
                                    })
                                ),
                        ]}
                        onChangeComplete={() => {}}
                        disabled={samplingRunning}
                    />
                </div>

                <StartStopButton
                    title={startStopTitle}
                    startText="Start"
                    stopText="Stop"
                    onClick={async () => {
                        if (samplingRunning) {
                            dispatch(samplingStop());
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
            </Group>
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
