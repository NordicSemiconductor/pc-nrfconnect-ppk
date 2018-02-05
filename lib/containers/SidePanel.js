/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
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

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import SidePanel from '../components/SidePanel';
import withHotkey from '../utils/withHotKey';

import {
    averageStart,
    averageStop,
    ppkUpdateRegulator,
    ppkTriggerUpdateWindow,
    ppkTriggerToggle,
    ppkTriggerSet,
    ppkTriggerSingleSet,
    ppkToggleDUT,
    updateResistors,
    resetResistors,
    externalTriggerToggled,
    spikeFilteringToggle,
    ppkSwitchingPointsReset,
    ppkSwitchingPointsDownSet,
    ppkSwitchingPointsUpSet,
} from '../actions/PPKActions';

import {
    triggerUnitChanged,
    moveTriggerWindowLength,
    moveVoltageRegulatorVdd,
    updateHighResistor,
    updateMidResistor,
    updateLowResistor,
    switchingPointUpMoved,
    switchingPointDownMoved,
    toggleAdvancedMode,
} from '../actions/uiActions';

export default withHotkey(connect(
    state => ({
        deviceRunning: state.app.app.deviceRunning,
        averageRunning: state.app.average.averageRunning,
        externalTrigger: state.app.trigger.externalTrigger,
        rttRunning: state.app.app.rttRunning,
        triggerRunning: state.app.trigger.triggerRunning,
        triggerSingleWaiting: state.app.trigger.triggerSingleWaiting,
        triggerWindowLength: state.app.trigger.windowLength,
        triggerUnit: state.app.trigger.triggerUnit,
        voltageRegulatorVdd: state.app.voltageRegulator.vdd,

        resistorLow: state.app.resistorCalibration.userResLo,
        resistorMid: state.app.resistorCalibration.userResMid,
        resistorHigh: state.app.resistorCalibration.userResHi,

        switchUpHigh: state.app.switchingPoints.switchUpHigh,
        switchUpLow: state.app.switchingPoints.switchUpLow,
        switchDownHigh: state.app.switchingPoints.switchDownHigh,
        switchDownLow: state.app.switchingPoints.switchDownLow,
        switchUpSliderPosition: state.app.switchingPoints.switchUpSliderPosition,
        switchDownSliderPosition: state.app.switchingPoints.switchDownSliderPosition,
        spikeFiltering: state.app.switchingPoints.spikeFiltering,

        advancedMode: state.app.app.advancedMode,
        hidden: state.app.app.fullView,
    }),
    dispatch => ({
        ...bindActionCreators({
            averageStart,
            averageStop,
            ppkUpdateRegulator,
            ppkTriggerUpdateWindow,
            ppkTriggerToggle,
            ppkTriggerSet,
            ppkTriggerSingleSet,
            ppkToggleDUT,
            updateResistors,
            resetResistors,
            externalTriggerToggled,
            spikeFilteringToggle,
            triggerUnitChanged,
            moveTriggerWindowLength,
            moveVoltageRegulatorVdd,
            updateHighResistor,
            updateMidResistor,
            updateLowResistor,
            switchingPointUpMoved,
            switchingPointDownMoved,
            ppkSwitchingPointsUpSet,
            ppkSwitchingPointsDownSet,
            ppkSwitchingPointsReset,
        }, dispatch),
        toggleAdvancedMode: () => dispatch(toggleAdvancedMode()),
    }),
)(SidePanel));
