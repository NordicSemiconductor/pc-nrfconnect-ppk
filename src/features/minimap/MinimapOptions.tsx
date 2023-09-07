/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { isRealTimePane as isRealTimePaneSelector } from '../../utils/panes';
import {
    setShowMinimapAction,
    showMinimap as getShowMinimap,
} from './minimapSlice';

export default () => {
    const dispatch = useDispatch();
    const showMinimap = useSelector(getShowMinimap);
    const isRealTimePane = useSelector(isRealTimePaneSelector);

    if (isRealTimePane) return null;

    return (
        <Button
            variant="secondary"
            className="w-100"
            title={`Click in order to ${
                showMinimap ? 'hide' : 'show'
            } a navigable minimap`}
            onClick={() => dispatch(setShowMinimapAction(!showMinimap))}
        >
            {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
        </Button>
    );
};
