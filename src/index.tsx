/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    App,
    render,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import Chart from './components/Chart/Chart';
import DeviceSelector from './components/DeviceSelector';
import SidePanel from './components/SidePanel/SidePanel';
import reducers from './slices';

import './index.scss';

telemetry.enableTelemetry();

render(
    <App
        appReducer={reducers}
        deviceSelect={<DeviceSelector />}
        sidePanel={<SidePanel />}
        feedback
        panes={[
            { name: 'Data Logger', Main: Chart },
            { name: 'Real Time', Main: Chart },
        ]}
    />
);
