/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    CollapsibleGroup,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    chartState,
    toggleDigitalChannels,
    toggleTimestamps,
} from '../../slices/chartSlice';
import { isDataLoggerPane } from '../../utils/panes';
import DigitalChannels from './DigitalChannels';

export default () => {
    const dispatch = useDispatch();
    const { digitalChannelsVisible, timestampsVisible, hasDigitalChannels } =
        useSelector(chartState);
    const isDataLogger = useSelector(isDataLoggerPane);

    return (
        <CollapsibleGroup heading="Display options" defaultCollapsed={false}>
            <Toggle
                onToggle={() => dispatch(toggleTimestamps())}
                isToggled={timestampsVisible}
                label="Timestamps"
                variant="primary"
            />
            {hasDigitalChannels && isDataLogger && (
                <>
                    <Toggle
                        onToggle={() => dispatch(toggleDigitalChannels())}
                        isToggled={digitalChannelsVisible}
                        label="Digital channels"
                        variant="primary"
                    />
                    <DigitalChannels />
                </>
            )}
        </CollapsibleGroup>
    );
};
