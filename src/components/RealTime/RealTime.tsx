/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { PaneProps } from '@nordicsemiconductor/pc-nrfconnect-shared';

import Chart from '../Chart/Chart';

export default ({ active }: PaneProps) => {
    if (!active) {
        return null;
    }
    return <Chart />;
};
