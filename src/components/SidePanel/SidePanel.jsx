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
import PropTypes from 'prop-types';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';

import Buffer from './Buffer';
import DigitalChannels from './DigitalChannels';
import DisplayOptions from './DisplayOptions';
import StartStop from './StartStop';
import Trigger from './Trigger';
import VoltageRegulator from './VoltageRegulator';
import SwitchPoints from './SwitchPoints';
import ResistorCalibration from './ResistorCalibration';
import Gains from './Gains';
import withHotkey from '../../utils/withHotKey';

import {
    appState,
    toggleAdvancedModeAction,
    toggleExportCSVDialogVisible,
} from '../../reducers/appReducer';
import { load, save } from '../../actions/fileActions';
import { chartState } from '../../reducers/chartReducer';

import './sidepanel.scss';
import SpikeFilter from './SpikeFilter';

const SidePanel = ({ bindHotkey }) => {
    const dispatch = useDispatch();
    bindHotkey('alt+ctrl+shift+a', () => dispatch(toggleAdvancedModeAction()));

    const { capabilities, samplingRunning } = useSelector(appState);
    const { cursorBegin, cursorEnd } = useSelector(chartState);
    const chartCursorActive = ((cursorBegin !== null) || (cursorEnd !== null));

    const deviceOpen = (Object.keys(capabilities).length > 0);

    return (
        <div className="sidepanel d-flex flex-column">
            {deviceOpen && (
                <>
                    <StartStop />
                    <Trigger />
                    <Buffer />
                    <DigitalChannels />
                    <Accordion defaultActiveKey="1">
                        <VoltageRegulator eventKey="1" />
                        <SwitchPoints eventKey="2" />
                        <ResistorCalibration eventKey="3" />
                        <Gains eventKey="4" />
                        <SpikeFilter eventKey="5" />
                    </Accordion>
                </>
            )}
            {deviceOpen || (
                <>
                    <p>Please open your device first, or</p>
                    <Button
                        className="mb-3 w-100"
                        variant="set"
                        onClick={() => dispatch(load())}
                    >
                        LOAD
                    </Button>
                    <DigitalChannels />
                </>
            )}
            <div className="flex-fill" />
            <DisplayOptions />
            <Button
                className="my-3 w-100"
                variant="set"
                disabled={samplingRunning}
                onClick={() => dispatch(save())}
            >
                SAVE
            </Button>
            <Button
                className="mb-3 w-100"
                variant="set"
                disabled={samplingRunning}
                onClick={() => dispatch(toggleExportCSVDialogVisible())}
            >
                EXPORT {chartCursorActive ? 'MARKED' : 'WINDOW'}
            </Button>
        </div>
    );
};

SidePanel.propTypes = {
    bindHotkey: PropTypes.func.isRequired,
};

export default withHotkey(SidePanel);
