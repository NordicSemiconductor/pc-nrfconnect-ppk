/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Group } from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    setShowMinimapAction,
    showMinimap as getShowMinimap,
} from './minimapSlice';

export default () => {
    const dispatch = useDispatch();
    const showMinimap = useSelector(getShowMinimap);

    return (
        <Group>
            <Button
                variant="secondary"
                className="tw-w-full"
                title={`Click in order to ${
                    showMinimap ? 'hide' : 'show'
                } a navigable minimap`}
                onClick={() => dispatch(setShowMinimapAction(!showMinimap))}
            >
                {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            </Button>
        </Group>
    );
};
