/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from 'pc-nrfconnect-shared';

import {
    setShowMinimap,
    showMinimap as getShowMinimap,
} from '../../slices/chartSlice';

export default () => {
    const showMinimap = useSelector(getShowMinimap);
    const dispatch = useDispatch();

    return (
        <Button
            variant="secondary"
            className="w-100"
            title={`Click in order to ${
                showMinimap ? 'hide' : 'show'
            } a navigable minimap`}
            onClick={() => dispatch(setShowMinimap(!showMinimap))}
        >
            {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
        </Button>
    );
};
