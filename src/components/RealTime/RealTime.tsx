/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { setupOptions, triggerStop } from '../../actions/deviceActions';
import { isRealTimePane } from '../../utils/panes';
import Chart from '../Chart/Chart';

export default () => {
    const dispatch = useDispatch();
    const active = useSelector(isRealTimePane);
    useEffect(() => {
        dispatch(setupOptions());

        return () => {
            if (active) {
                () => dispatch(triggerStop());
            }
        };
    }, [active, dispatch]);

    if (!active) {
        return null;
    }
    return <Chart />;
};
