/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    CollapsibleGroup,
    StateSelector,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { DataManager } from '../../globals';
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

    return (
        <CollapsibleGroup heading="Display options" defaultCollapsed={false}>
            <Toggle
                onToggle={() => dispatch(toggleTimestamps())}
                isToggled={timestampsVisible}
                label="Timestamps"
                variant="primary"
            />
            <StateSelector
                items={['Relative', 'Absolute']}
                onSelect={(index: number) => {
                    dispatch(setShowSystemTime(!!index));
                }}
                selectedItem={
                    !!DataManager().getStartSystemTime() && systemTime
                        ? 'Absolute'
                        : 'Relative'
                }
                disabled={!DataManager().getStartSystemTime()}
            />

            <>
                <Toggle
                    onToggle={() => dispatch(toggleDigitalChannels())}
                    isToggled={digitalChannelsVisible}
                    label="Digital channels"
                    variant="primary"
                />
                <DigitalChannels />
            </>
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
        </CollapsibleGroup>
    );
};
