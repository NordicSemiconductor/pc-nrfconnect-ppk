/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import installSpecificVersionGif from '../../../resources/install_specific_version.gif';
import { getShowPPK1Dialog, setShowPPK1Dialog } from './DeprecatedDeviceSlice';

const DeprecatedDeviceDialog = () => {
    const dispatch = useDispatch();
    const showDialog = useSelector(getShowPPK1Dialog);

    const hide = () => dispatch(setShowPPK1Dialog(false));

    return (
        <GenericDialog
            onHide={hide}
            closeOnEsc
            isVisible={showDialog}
            title="Device Deprecated"
            size="xl"
            footer={<DialogButton onClick={hide}>Close</DialogButton>}
        >
            <div className="tw-flex tw-flex-col tw-gap-2 lg:tw-flex-row lg:tw-gap-14">
                <div>
                    <h4>We recommend using Power Profiler Kit II</h4>
                    <p>
                        From version 4.0.0 we no longer support the first
                        version of Power Profiler Kits. Instead, we recommend
                        that you replace the Power Profiler Kit with a Power
                        Profiler Kit II,{' '}
                        <a
                            target="_blank"
                            rel="noreferrer"
                            href="https://www.nordicsemi.com/About-us/BuyOnline?search_token=nrf-ppk2"
                        >
                            click here for a list of distributors
                        </a>
                        .
                    </p>

                    <h4>How to still use Power Profiler Kit I</h4>
                    <p>
                        If you still want to use your Power Profiler Kit, please
                        make sure that you have Power Profiler v3.5.5 installed.
                        If you see this message, then you need to downgrade to
                        an earlier version.
                    </p>
                    <h4>To install a specific version of Power Profiler</h4>
                    <ol>
                        <li>Open nRF Connect for Desktop.</li>
                        <li>Locate the Power Profiler application.</li>
                        <li>
                            Press the arrow down button and click on{' '}
                            <b>Install other version</b>.
                        </li>
                        <li>
                            In the dialog, select version v3.5.5, and press
                            Install.
                        </li>
                    </ol>
                    <p className="tw-italic">
                        Note that the downgraded version of Power Profiler has
                        only been tested with nRF Connect for Desktop v4.1.2,
                        and future releases may be subject to incompatibilities
                        with Power Profiler v3.5.5.
                    </p>
                </div>
                <div>
                    <img
                        className="tw-w-full"
                        src={installSpecificVersionGif}
                        alt="How to install specific app version"
                    />
                </div>
            </div>
        </GenericDialog>
    );
};

export default DeprecatedDeviceDialog;
