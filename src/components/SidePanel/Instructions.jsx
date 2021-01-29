/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import { Group, openUrl } from 'pc-nrfconnect-shared';

import './instructions.scss';

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
            className="user-guide-link"
            variant="link"
            onClick={() => openUrl(urls.ppkUserGuide)}
        >
            PPK User Guide
        </Button>
        <Button
            className="user-guide-link"
            variant="link"
            onClick={() => openUrl(urls.ppk2UserGuide)}
        >
            PPK2 User Guide
        </Button>
        <Button
            variant="set"
            className="mt-3 w-100 secondary-btn"
            onClick={() => openUrl(urls.purchase)}
        >
            Get PPK2 device
        </Button>
    </Group>
);
