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

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SidePanel, useHotKey } from 'pc-nrfconnect-shared';

import { setCurrentPane } from '../../from_pc-nrfconnect-shared';
import { options } from '../../globals';
import {
    advancedMode as advancedModeSelector,
    appState,
    deviceOpen as deviceOpenSelector,
    toggleAdvancedModeAction,
} from '../../reducers/appReducer';
import {
    DATA_LOGGER,
    isDataLoggerPane,
    isRealTimePane,
} from '../../utils/panes';
import persistentStore from '../../utils/persistentStore';
import DisplayOptions from './DisplayOptions';
import Gains from './Gains';
import Instructions from './Instructions';
import { Load, Save } from './LoadSave';
import PowerMode from './PowerMode';
import ResistorCalibration from './ResistorCalibration';
import SpikeFilter from './SpikeFilter';
import StartStop from './StartStop';
import SwitchPoints from './SwitchPoints';
import Trigger from './Trigger/Trigger';

import './sidepanel.scss';

export default () => {
    const dispatch = useDispatch();
    useHotKey('alt+ctrl+shift+a', () => dispatch(toggleAdvancedModeAction()));
    useEffect(() => {
        dispatch(
            setCurrentPane(persistentStore.get('currentPane', DATA_LOGGER))
        );
    }, [dispatch]);

    const advancedMode = useSelector(advancedModeSelector);
    const deviceOpen = useSelector(deviceOpenSelector);
    const { fileLoaded } = useSelector(appState);

    const realTimePane = useSelector(isRealTimePane);
    const dataLoggerPane = useSelector(isDataLoggerPane);

    if (fileLoaded) {
        return (
            <SidePanel className="side-panel">
                <Load />
                <DisplayOptions />
                <Save />
            </SidePanel>
        );
    }

    if (!deviceOpen) {
        return (
            <SidePanel className="side-panel">
                <Load />
                <Instructions />
            </SidePanel>
        );
    }

    if (!realTimePane && !dataLoggerPane) {
        return null;
    }

    return (
        <SidePanel className="side-panel">
            <PowerMode />
            {realTimePane && <Trigger />}
            {dataLoggerPane && <StartStop />}
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
