/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { useDispatch, useSelector } from 'react-redux';
import { Group, Toggle } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { setDeviceRunning, setPowerMode } from '../../actions/deviceActions';
import { appState } from '../../slices/appSlice';
import { triggerState } from '../../slices/triggerSlice';
import VoltageRegulator from './VoltageRegulator';

export default () => {
    const dispatch = useDispatch();
    const { capabilities, isSmuMode, deviceRunning, samplingRunning } =
        useSelector(appState);
    const { triggerRunning, triggerSingleWaiting } = useSelector(triggerState);

    const togglePowerMode = () => dispatch(setPowerMode(!isSmuMode));

    const isRunning = samplingRunning || triggerRunning || triggerSingleWaiting;

    return (
        <Group heading={`${capabilities.ppkSetPowerMode ? 'Mode' : ''}`}>
            {capabilities.ppkSetPowerMode && (
                <ButtonGroup
                    className={`power-mode w-100 ${
                        isRunning ? 'disabled' : ''
                    }`}
                >
                    <Button
                        title="Measure current on device under test powered by PPK2"
                        variant={isSmuMode ? 'set' : 'unset'}
                        disabled={isSmuMode || isRunning}
                        onClick={togglePowerMode}
                    >
                        Source meter
                        <div className="dot sourcemeter" />
                    </Button>
                    <Button
                        title="Measure current on device under test powered externally"
                        variant={isSmuMode ? 'unset' : 'set'}
                        disabled={!isSmuMode || isRunning}
                        onClick={togglePowerMode}
                    >
                        Ampere meter
                        <div className="dot amperemeter" />
                    </Button>
                </ButtonGroup>
            )}
            <VoltageRegulator />
            {capabilities.ppkDeviceRunning && (
                <Toggle
                    title="Turn power on/off for device under test"
                    onToggle={() => dispatch(setDeviceRunning(!deviceRunning))}
                    isToggled={deviceRunning}
                    label="Enable power output"
                    variant="primary"
                />
            )}
        </Group>
    );
};
