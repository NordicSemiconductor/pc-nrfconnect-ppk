/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import {
    DeviceSelector,
    DeviceSetupConfig,
    getAppFile,
    isDeviceInDFUBootloader,
    sdfuDeviceSetup,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { close, open } from '../actions/deviceActions';

const deviceListing = {
    nordicUsb: true,
    nordicDfu: true,
    serialPorts: true,
};

export const deviceSetupConfig: DeviceSetupConfig = {
    deviceSetups: [
        sdfuDeviceSetup(
            [
                {
                    key: 'ppk2',
                    application: getAppFile(
                        'firmware/pca63100_ppk2_1.2.4_db16a94.hex',
                    ),
                    semver: 'power_profiler_kit_2 1.2.4-db16a94',
                    params: {},
                },
            ],
            false,
            d =>
                !isDeviceInDFUBootloader(d) &&
                !!d.serialPorts &&
                d.serialPorts.length > 0 &&
                !!d.traits.nordicUsb &&
                !!d.usb &&
                d.usb.device.descriptor.idProduct === 0xc00a,
        ),
    ],
};

export default () => {
    const dispatch = useDispatch();

    return (
        <DeviceSelector
            deviceSetupConfig={deviceSetupConfig}
            deviceListing={deviceListing}
            deviceFilter={device =>
                isDeviceInDFUBootloader(device) ||
                device.usb?.device.descriptor.idProduct === 0xc00a
            }
            onDeviceIsReady={device => {
                dispatch(open(device));
            }}
            onDeviceDeselected={() => {
                dispatch(close());
            }}
        />
    );
};
