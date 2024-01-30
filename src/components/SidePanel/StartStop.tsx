/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    Group,
    Slider,
    StartStopButton,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { unit } from 'mathjs';

import { samplingStart, samplingStop } from '../../actions/deviceActions';
import { DataManager } from '../../globals';
import { appState } from '../../slices/appSlice';
import { isSessionActive, resetChartTime } from '../../slices/chartSlice';
import {
    dataLoggerState,
    getSamplingMode,
    updateSampleFreqLog10,
} from '../../slices/dataLoggerSlice';
import {
    getAutoExportTrigger,
    resetTriggerOrigin,
    setTriggerSavePath,
} from '../../slices/triggerSlice';
import { selectDirectoryDialog } from '../../utils/fileUtils';

const fmtOpts = { notation: 'fixed' as const, precision: 1 };

export default () => {
    const dispatch = useDispatch();
    const sessionActive = useSelector(isSessionActive);
    const mode = useSelector(getSamplingMode);
    const autoExport = useSelector(getAutoExportTrigger);

    const { samplingRunning } = useSelector(appState);
    const { sampleFreqLog10, sampleFreq, maxFreqLog10 } =
        useSelector(dataLoggerState);

    const startButtonTooltip = `Start sampling at ${unit(sampleFreq, 'Hz')
        .format(fmtOpts)
        .replace('.0', '')}`;

    const startStopTitle = !samplingRunning ? startButtonTooltip : undefined;

    return (
        <Group heading="Sampling parameters">
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
                    disabled={samplingRunning || sessionActive}
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

                    if (mode === 'Trigger' && autoExport) {
                        const filePath = await selectDirectoryDialog();
                        dispatch(setTriggerSavePath(filePath));
                    }

                    dispatch(samplingStart());
                }}
                showIcon
                variant="secondary"
                started={samplingRunning}
                disabled={!samplingRunning && sessionActive}
            />

            <Button
                title={startStopTitle}
                size="lg"
                onClick={async () => {
                    await DataManager().reset();
                    dispatch(resetChartTime());
                    dispatch(resetTriggerOrigin());
                }}
                variant="secondary"
                disabled={samplingRunning || !sessionActive}
            >
                Clear session data
            </Button>
        </Group>
    );
};
