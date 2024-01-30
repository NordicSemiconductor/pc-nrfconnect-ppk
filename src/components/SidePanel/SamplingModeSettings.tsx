/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Group,
    StateSelector,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../slices/appSlice';
import {
    getSamplingMode,
    SamplingModeValues,
    setSamplingMode,
} from '../../slices/dataLoggerSlice';
import { resetTriggerOrigin } from '../../slices/triggerSlice';
import LiveModeSettings from './LiveModeSettings';
import TriggerSettings from './TriggerSettings';

export default () => {
    const dispatch = useDispatch();
    const mode = useSelector(getSamplingMode);

    const { samplingRunning } = useSelector(appState);

    useEffect(() => {
        dispatch(resetTriggerOrigin());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    return (
        <Group heading="Sampling Mode">
            <StateSelector
                items={[...SamplingModeValues]}
                onSelect={m => {
                    dispatch(setSamplingMode(SamplingModeValues[m]));
                }}
                selectedItem={mode}
                disabled={samplingRunning}
            />
            {mode === 'Live' && <LiveModeSettings />}
            {mode === 'Trigger' && <TriggerSettings />}
        </Group>
    );
};
