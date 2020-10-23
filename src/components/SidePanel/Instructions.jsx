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

import { openUrl } from 'pc-nrfconnect-shared';
import Group from './Group';

const ppk1ug =
    'https://infocenter.nordicsemi.com/index.jsp?topic=%2Fug_ppk%2FUG%2Fppk%2FPPK_user_guide_Intro.html';
const ppk2ug =
    'https://infocenter.nordicsemi.com/index.jsp?topic=%2Fug_ppk%2FUG%2Fppk%2FPPK_user_guide_Intro.html';

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
        <p>
            <Button variant="link" onClick={() => openUrl(ppk1ug)}>
                PPK User Guide
            </Button>
        </p>
        <p>
            <Button variant="link" onClick={() => openUrl(ppk2ug)}>
                PPK2 User Guide
            </Button>
        </p>
    </Group>
);
