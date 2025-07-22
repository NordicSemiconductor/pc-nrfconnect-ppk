/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Group,
    StateSelector,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    setShowMinimapAction,
    showMinimap as getShowMinimap,
} from '../../features/minimap/minimapSlice';
import { DataManager } from '../../globals';
import { deviceOpen as isDeviceOpen } from '../../slices/appSlice';
import {
    getChartDigitalChannelInfo,
    isTimestampsVisible,
    setShowSystemTime,
    showSystemTime,
    toggleDigitalChannels,
    toggleTimestamps,
} from '../../slices/chartSlice';
import { isDataLoggerPane } from '../../utils/panes';
import DigitalChannels from './DigitalChannels';

export default () => {
    const dispatch = useDispatch();
    const { digitalChannelsVisible } = useSelector(getChartDigitalChannelInfo);
    const timestampsVisible = useSelector(isTimestampsVisible);
    const systemTime = useSelector(showSystemTime);
    const showMinimap = useSelector(getShowMinimap);
    const dataLoggerPane = useSelector(isDataLoggerPane);
    const deviceOpen = useSelector(isDeviceOpen);

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
