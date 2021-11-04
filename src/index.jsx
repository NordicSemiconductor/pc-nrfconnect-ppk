/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { App } from 'pc-nrfconnect-shared';

import DataLogger from './components/DataLogger/DataLogger';
import DeviceSelector from './components/DeviceSelector';
import RealTime from './components/RealTime/RealTime';
import SidePanel from './components/SidePanel/SidePanel';
import reducers from './reducers';

import './index.scss';

export default () => (
    <App
        appReducer={reducers}
        deviceSelect={<DeviceSelector />}
        sidePanel={<SidePanel />}
        panes={[
            { name: 'Data Logger', Main: DataLogger },
            { name: 'Real-time', Main: RealTime },
        ]}
    />
);
