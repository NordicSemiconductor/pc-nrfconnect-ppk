/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    Button,
    ExternalLink,
    Group,
    openUrl,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

const urls = {
    ppk2UserGuide:
        'https://docs.nordicsemi.com/bundle/ug_ppk2/page/UG/ppk/PPK_user_guide_Intro.html',
    purchase:
        'https://www.nordicsemi.com/About-us/BuyOnline?search_token=nRF-PPK2',
};

export default () => (
    <Group heading="Instructions">
        <p>
            The Power Profiler Kit II (PPK2) is an affordable, flexible tool
            that measures real-time power consumption of your designs.
        </p>
        <p>
            Select a PPK2 device to sample real-time measurements or load an
            existing data set.
        </p>
        <p>
            <i>PPK2</i> hardware is required to sample real-time measurements.
        </p>
        <ExternalLink label="PPK2 User Guide" href={urls.ppk2UserGuide} />
        <Button
            variant="secondary"
            key="button"
            className="tw-w-full"
            onClick={() => openUrl(urls.purchase)}
        >
            Get PPK2 device
        </Button>
    </Group>
);
