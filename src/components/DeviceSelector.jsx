/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { connect } from 'react-redux';
import {
    DeviceSelector,
    getAppFile,
    logger,
    usageData,
} from 'pc-nrfconnect-shared';

import { close, open } from '../actions/deviceActions';
import EventAction from '../usageDataActions';

const deviceListing = {
    nordicUsb: true,
    serialport: true,
    jlink: true,
};

const deviceSetup = {
    dfu: {
        ppk2: {
            application: getAppFile('firmware/pca63100_ppk2_5e7cc60.hex'),
            semver: 'power_profiler_kit_2 1.0.0-5e7cc60',
        },
    },
    jprog: {
        nrf52: {
            fw: getAppFile('firmware/ppk_nrfconnect.hex'),
            fwVersion: 'ppk-fw-2.1.0',
            fwIdAddress: 0x10000,
        },
    },
};

const mapState = () => ({
    deviceListing,
    deviceSetup,
});

const mapDispatch = dispatch => ({
    onDeviceSelected: device => {
        logger.info(
            `Validating firmware for device with s/n ${device.serialNumber}`
        );
    },
    onDeviceDeselected: () => {
        logger.info('Deselecting device');
        dispatch(close());
    },
    releaseCurrentDevice: () => dispatch(close()),
    onDeviceIsReady: device => {
        logger.info(`Opening device with s/n ${device.serialNumber}`);
        dispatch(open(device));
        console.log(device);
        if (device.capabilities.hwTrigger) {
            usageData.sendUsageData(EventAction.PPK_1_SELECTED);
        }
    },
});

export default connect(mapState, mapDispatch)(DeviceSelector);
