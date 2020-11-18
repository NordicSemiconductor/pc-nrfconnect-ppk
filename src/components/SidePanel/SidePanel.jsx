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
import { func } from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';

import { openUrl } from 'pc-nrfconnect-shared/src/open';

import Buffer from './Buffer';
import DisplayOptions from './DisplayOptions';
import StartStop from './StartStop';
import Trigger from './Trigger';
import VoltageRegulator from './VoltageRegulator';
import SwitchPoints from './SwitchPoints';
import ResistorCalibration from './ResistorCalibration';
import Gains from './Gains';
import SpikeFilter from './SpikeFilter';
import WithHotkey from '../../utils/WithHotKey';

import {
    appState,
    showExportDialog,
    toggleAdvancedModeAction,
    toggleSaveChoiceDialog,
    toggleSaveAction,
} from '../../reducers/appReducer';
import { load } from '../../actions/fileActions';

import { options } from '../../globals';

import './sidepanel.scss';

const ppk1ug =
    'https://infocenter.nordicsemi.com/index.jsp?topic=%2Fug_ppk%2FUG%2Fppk%2FPPK_user_guide_Intro.html';
const ppk2ug =
    'https://infocenter.nordicsemi.com/index.jsp?topic=%2Fug_ppk%2FUG%2Fppk%2FPPK_user_guide_Intro.html';

const SidePanel = ({ bindHotkey }) => {
    const dispatch = useDispatch();
    bindHotkey('alt+ctrl+shift+a', () => dispatch(toggleAdvancedModeAction()));
    bindHotkey('alt+ctrl+shift+l', () => dispatch(toggleSaveAction()));

    const {
        capabilities,
        samplingRunning,
        advancedMode,
        enableSave,
    } = useSelector(appState);

    const saveExportLabel = enableSave ? 'Save / Export' : 'Export';
    const saveExportTitle = enableSave
        ? 'Stop sampling to save or export'
        : 'Stop sampling to export';
    const saveExportAction = enableSave
        ? toggleSaveChoiceDialog
        : showExportDialog;

    const deviceOpen = Object.keys(capabilities).length > 0;

    return (
        <div className="sidepanel d-flex flex-column">
            {deviceOpen || (
                <>
                    {enableSave && (
                        <Button
                            className="w-100"
                            variant="set"
                            onClick={() => dispatch(load())}
                        >
                            Load
                        </Button>
                    )}
                    <h2>INSTRUCTIONS</h2>
                    <p>
                        The Power Profiler Kit (PPK) is an affordable, flexible
                        tool that measures real-time power consumption of your
                        designs.
                    </p>
                    <p>
                        Select a device to sample real-time measurements or load
                        an existing data set.
                    </p>
                    <p>
                        <i>PPK</i> or <i>PPK2</i> hardware is required to sample
                        real-time measurements.
                    </p>
                    <Button variant="link" onClick={() => openUrl(ppk1ug)}>
                        PPK User Guide
                    </Button>
                    <Button variant="link" onClick={() => openUrl(ppk2ug)}>
                        PPK2 User Guide
                    </Button>
                </>
            )}
            {deviceOpen && (
                <>
                    <StartStop />
                    <Buffer />
                    <Trigger eventKey="0" />
                    <VoltageRegulator eventKey="1" />
                </>
            )}
            <DisplayOptions />
            {options.timestamp === null || (
                <Button
                    className="w-100 mt-3"
                    title={samplingRunning && saveExportTitle}
                    variant="set"
                    disabled={samplingRunning}
                    onClick={() => dispatch(saveExportAction())}
                >
                    {saveExportLabel}
                </Button>
            )}
            {deviceOpen && advancedMode && (
                <>
                    <SwitchPoints eventKey="2" />
                    <ResistorCalibration eventKey="3" />
                    <Gains eventKey="4" />
                    <SpikeFilter eventKey="5" />
                </>
            )}
        </div>
    );
};

SidePanel.propTypes = {
    bindHotkey: func.isRequired,
};
export default WithHotkey(SidePanel);
