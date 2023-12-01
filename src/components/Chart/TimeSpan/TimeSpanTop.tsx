/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useSelector } from 'react-redux';

import { getWindowDuration } from '../../../slices/chartSlice';
import TimeSpanLabel from './TimeSpanLabel';

import './timespan.scss';

const TimeSpanTop = ({ width }: { width: number }) => {
    const windowDuration = useSelector(getWindowDuration);

    return (
        <div className="timespan window" style={{ width }}>
            <TimeSpanLabel duration={windowDuration} />
        </div>
    );
};

export default TimeSpanTop;
