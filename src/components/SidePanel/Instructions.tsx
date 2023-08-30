/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    Button,
    Group,
    openUrl,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

const urls = {
    ppkUserGuide:
        'https://infocenter.nordicsemi.com/topic/ug_ppk/UG/ppk/PPK_user_guide_Intro.html',
    ppk2UserGuide:
        'https://infocenter.nordicsemi.com/topic/ug_ppk2/UG/ppk/PPK_user_guide_Intro.html',
    purchase:
        'https://www.nordicsemi.com/About-us/BuyOnline?search_token=nRF-PPK2',
};

export default () => (
    <Group heading="Instructions">
        <p>
            The Power Profiler Kit (PPK) is an affordable, flexible tool that
            measures real-time power consumption of your designs.
        </p>
        <p>
            Select a device to sample real-time measurements or load an existing
            data set.
        </p>
        <p>
            <i>PPK</i> or <i>PPK2</i> hardware is required to sample real-time
            measurements.
        </p>
        <Button
            className="pl-0"
            variant="link"
            onClick={() => openUrl(urls.ppkUserGuide)}
        >
            PPK User Guide
        </Button>
        <Button
            className="pl-0"
            variant="link"
            onClick={() => openUrl(urls.ppk2UserGuide)}
        >
            PPK2 User Guide
        </Button>
        <Button
            variant="secondary"
            key="button"
            className="w-100 mt-3"
            onClick={() => openUrl(urls.purchase)}
        >
            Get PPK2 device
        </Button>
    </Group>
);
