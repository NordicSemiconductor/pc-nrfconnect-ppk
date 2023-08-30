/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Group } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { triggerState } from '../../../slices/triggerSlice';
import { CONTINUOUS } from './triggerConstants';
import TriggerLength from './TriggerLength';
import TriggerLevel from './TriggerLevel';
import TriggerModeGroup from './TriggerModeGroup';
import TriggerStart from './TriggerStart';

import './trigger.scss';

const Trigger = () => {
    const { triggerLevel, triggerRunning } = useSelector(triggerState);

    const [triggerMode, setTriggerMode] = useState(CONTINUOUS);

    return (
        <>
            <Group heading="Trigger parameters">
                <TriggerLength />
                <TriggerLevel triggerLevel={triggerLevel} />
            </Group>
            <Group heading="Trigger type">
                <TriggerModeGroup
                    triggerMode={triggerMode}
                    setTriggerMode={setTriggerMode}
                    triggerRunning={triggerRunning}
                />
                <TriggerStart triggerMode={triggerMode} />
            </Group>
        </>
    );
};

export default Trigger;
