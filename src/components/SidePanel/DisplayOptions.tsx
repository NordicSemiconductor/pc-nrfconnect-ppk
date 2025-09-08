/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Group,
    NumberInput,
    StateSelector,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    setShowMinimapAction,
    showMinimap as getShowMinimap,
} from '../../features/minimap/minimapSlice';
import { DataManager } from '../../globals';
import { appState, deviceOpen as isDeviceOpen } from '../../slices/appSlice';
import {
    getChartDigitalChannelInfo,
    isTimestampsVisible,
    setShowSystemTime,
    showEnergyInAmpereMeter,
    showSystemTime,
    toggleDigitalChannels,
    toggleEnergyInAmpereMeter,
    toggleTimestamps,
} from '../../slices/chartSlice';
import { isDataLoggerPane } from '../../utils/panes';
import DigitalChannels from './DigitalChannels';

export default () => {
    const dispatch = useDispatch();
    const { isSmuMode } = useSelector(appState);
    const { digitalChannelsVisible } = useSelector(getChartDigitalChannelInfo);
    const timestampsVisible = useSelector(isTimestampsVisible);
    const systemTime = useSelector(showSystemTime);
    const showMinimap = useSelector(getShowMinimap);
    const dataLoggerPane = useSelector(isDataLoggerPane);
    const deviceOpen = useSelector(isDeviceOpen);
    const showEnergy = useSelector(showEnergyInAmpereMeter);

    console.log(showEnergy);

    return (
        <Group
            heading="Display options"
            collapsible
            gap={4}
            defaultCollapsed
            collapseStatePersistanceId="display-options-group"
        >
            <Toggle
                onToggle={() => dispatch(toggleTimestamps())}
                isToggled={timestampsVisible}
                label="Timestamps"
                variant="primary"
            />
            {timestampsVisible &&
                (DataManager().getStartSystemTime() || deviceOpen) && (
                    <StateSelector
                        items={['Relative', 'Absolute']}
                        onSelect={(index: number) => {
                            dispatch(setShowSystemTime(!!index));
                        }}
                        selectedItem={systemTime ? 'Absolute' : 'Relative'}
                        disabled={!timestampsVisible}
                        size="sm"
                    />
                )}

            {!isSmuMode && (
                <Toggle
                    onToggle={() => dispatch(toggleEnergyInAmpereMeter())}
                    isToggled={showEnergy}
                    label="Energy calculation"
                />
            )}

            {!isSmuMode && showEnergy && (
                <NumberInput
                    label="Provided voltage"
                    value={3300}
                    showSlider
                    unit="mV"
                    range={{ min: 800, max: 5000 }}
                    onChange={(value: any) => {
                        console.log('Setting VDD to', value);
                    }}
                    onChangeComplete={() => console.log('VDD set')}
                    title="This value is used only for energy calculations. It does not affect the device."
                />
            )}

            <Toggle
                onToggle={() => dispatch(toggleDigitalChannels())}
                isToggled={digitalChannelsVisible}
                label="Digital channels"
                variant="primary"
            />
            {digitalChannelsVisible && <DigitalChannels />}

            {dataLoggerPane && (
                <Toggle
                    label="Show Minimap"
                    title={`Click in order to ${
                        showMinimap ? 'hide' : 'show'
                    } a navigable minimap`}
                    onToggle={() =>
                        dispatch(setShowMinimapAction(!showMinimap))
                    }
                    isToggled={showMinimap}
                >
                    Show Minimap
                </Toggle>
            )}
        </Group>
    );
};
