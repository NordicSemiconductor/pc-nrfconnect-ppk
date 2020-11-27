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
import { useDispatch, useSelector } from 'react-redux';
import { SidePanel, useHotKey } from '../../from_pc-nrfconnect-shared';

import PowerMode from './PowerMode';
import DisplayOptions from './DisplayOptions';
import StartStop from './StartStop';
import Trigger from './Trigger/Trigger';
import VoltageRegulator from './VoltageRegulator';
import SwitchPoints from './SwitchPoints';
import ResistorCalibration from './ResistorCalibration';
import Gains from './Gains';
import SpikeFilter from './SpikeFilter';

import {
    toggleAdvancedModeAction,
    toggleSaveFunctionality,
    advancedMode as advancedModeSelector,
    deviceOpen as deviceOpenSelector,
} from '../../reducers/appReducer';

import { options } from '../../globals';
import Instructions from './Instructions';
import { Load, Save } from './LoadSave';
import { isScopePane, isDataLoggerPane } from '../../utils/panes';

import './sidepanel.scss';

export default () => {
    const dispatch = useDispatch();
    useHotKey('alt+ctrl+shift+a', () => dispatch(toggleAdvancedModeAction()));
    useHotKey('alt+ctrl+shift+l', () => dispatch(toggleSaveFunctionality()));

    const advancedMode = useSelector(advancedModeSelector);
    const deviceOpen = useSelector(deviceOpenSelector);

    const scopePane = isScopePane();
    const dataLoggerPane = isDataLoggerPane();

    if (!deviceOpen) {
        return (
            <SidePanel className="side-panel">
                <Load />
                <Instructions />
            </SidePanel>
        );
    }

    if (!scopePane && !dataLoggerPane) {
        return null;
    }

    return (
        <SidePanel className="side-panel">
            <PowerMode />
            {scopePane && <Trigger />}
            {dataLoggerPane && <StartStop />}
            <VoltageRegulator />
            {options.timestamp === null || (
                <>
                    <DisplayOptions />
                    <Save />
                </>
            )}
            {deviceOpen && advancedMode && (
                <>
                    <SwitchPoints />
                    <ResistorCalibration />
                    <Gains />
                    <SpikeFilter />
                </>
            )}
        </SidePanel>
    );
};
