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
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { appState } from '../../../slices/appSlice';
import {
    getTriggerCategory,
    setTriggerCategory,
    TriggerCategoryValues,
} from '../../../slices/triggerSlice';
import AnalogTriggerSettings from './AnalogTriggerSettings';
import DigitalTriggerSettings from './DigitalTriggerSettings';

export default () => {
    const dispatch = useDispatch();
    const { samplingRunning } = useSelector(appState);
    const triggerCategory = useSelector(getTriggerCategory);

    return (
        <Group
            heading="Trigger settings"
            gap={4}
            collapsible
            defaultCollapsed
            collapseStatePersistanceId="trigger-settings-group"
        >
            <StateSelector
                items={[...TriggerCategoryValues]}
                onSelect={m =>
                    dispatch(setTriggerCategory(TriggerCategoryValues[m]))
                }
                selectedItem={triggerCategory}
                disabled={samplingRunning}
                size="sm"
            />
            {triggerCategory === 'Analog' && <AnalogTriggerSettings />}
            {triggerCategory === 'Digital' && <DigitalTriggerSettings />}
        </Group>
    );
};
