/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { App, render } from '@nordicsemiconductor/pc-nrfconnect-shared';

import DataLogger from './components/DataLogger/DataLogger';
import DeviceSelector from './components/DeviceSelector';
import RealTime from './components/RealTime/RealTime';
import SidePanel from './components/SidePanel/SidePanel';
import reducers from './slices';

import './index.scss';

render(
    <App
        appReducer={reducers}
        deviceSelect={<DeviceSelector />}
        sidePanel={<SidePanel />}
        reportUsageData
        panes={[
            { name: 'Data Logger', Main: DataLogger },
            { name: 'Real-time', Main: RealTime },
        ]}
    />
);
