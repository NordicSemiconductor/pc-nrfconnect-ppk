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
import { appState, isSamplingRunning } from '../../slices/appSlice';
import VoltageRegulator from './VoltageRegulator';

export default () => {
    const dispatch = useDispatch();
    const { capabilities, isSmuMode, deviceRunning } = useSelector(appState);
    const samplingRunning = useSelector(isSamplingRunning);

    const togglePowerMode = () => dispatch(setPowerMode(!isSmuMode));

    return (
        <Group
            heading={`${
                capabilities.ppkSetPowerMode ? 'Power Supply Mode' : ''
            }`}
        >
            <div className="tw-flex tw-flex-col tw-gap-4">
                {capabilities.ppkSetPowerMode && (
                    <ButtonGroup
                        className={`power-mode w-100 ${
                            samplingRunning ? 'disabled' : ''
                        }`}
                    >
                        <Button
                            title="Measure current on device under test powered by PPK2"
                            variant={isSmuMode ? 'set' : 'unset'}
                            disabled={isSmuMode || samplingRunning}
                            onClick={togglePowerMode}
                        >
                            Source meter
                            <div
                                className={`tw-absolute tw-right-[1px] tw-top-[1px] tw-h-[6px] tw-w-[6px] tw-rounded-[6px] tw-bg-red ${
                                    isSmuMode ? 'tw-block' : 'tw-hidden'
                                }`}
                            />
                        </Button>
                        <Button
                            title="Measure current on device under test powered externally"
                            variant={isSmuMode ? 'unset' : 'set'}
                            disabled={!isSmuMode || samplingRunning}
                            onClick={togglePowerMode}
                        >
                            Ampere meter
                            <div
                                className={`tw-absolute tw-right-[1px] tw-top-[1px] tw-h-[6px] tw-w-[6px] tw-rounded-[6px] tw-bg-nordicBlue ${
                                    isSmuMode ? 'tw-hidden' : 'tw-block'
                                }`}
                            />
                        </Button>
                    </ButtonGroup>
                )}
                <VoltageRegulator />
                {capabilities.ppkDeviceRunning && (
                    <Toggle
                        title="Turn power on/off for device under test"
                        onToggle={() =>
                            dispatch(setDeviceRunning(!deviceRunning))
                        }
                        isToggled={deviceRunning}
                        label="Enable power output"
                        variant="primary"
                    />
                )}
            </div>
        </Group>
    );
};
