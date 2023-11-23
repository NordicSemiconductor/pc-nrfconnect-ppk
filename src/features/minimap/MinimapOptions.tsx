/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Group, Toggle } from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    setShowMinimapAction,
    showMinimap as getShowMinimap,
} from './minimapSlice';

export default () => {
    const dispatch = useDispatch();
    const showMinimap = useSelector(getShowMinimap);

    return (
        <Group>
            <Toggle
                label="Show Minimap"
                title={`Click in order to ${
                    showMinimap ? 'hide' : 'show'
                } a navigable minimap`}
                onToggle={() => dispatch(setShowMinimapAction(!showMinimap))}
                isToggled={showMinimap}
            >
                {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            </Toggle>
        </Group>
    );
};
