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
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import { unit } from 'mathjs';
import { triggerState } from '../../../reducers/triggerReducer';
import {
    triggerStart,
    triggerStop,
    triggerSingleSet,
} from '../../../actions/deviceActions';
import { SINGLE } from './triggerConstants';
import { appState } from '../../../reducers/appReducer';

function getButtonValues({ externalTrigger, isRunning, triggerMode, attrs }) {
    if (externalTrigger) {
        return ['External', null, null];
    }
    if (isRunning) {
        return triggerMode === SINGLE
            ? attrs.runningSingle
            : attrs.runningContinuous;
    }
    return triggerMode === SINGLE ? attrs.idleSingle : attrs.idleContinuous;
}

const TriggerStart = ({ triggerMode, rttRunning }) => {
    const dispatch = useDispatch();
    const {
        externalTrigger,
        triggerSingleWaiting,
        triggerRunning,
    } = useSelector(triggerState);

    const { capabilities } = useSelector(appState);

    const formattedFreq = unit(1e6 / capabilities.samplingTimeUs, 'Hz').format({
        notation: 'fixed',
        precision: 0,
    });

    const LABEL_START = 'Start';
    const LABEL_STOP = 'Stop';
    const LABEL_WAIT = 'Wait';
    const TITLE_IDLE = `Start sampling at ${formattedFreq} for a short duration when the set trigger level is reached`;
    const TITLE_RUNNING = 'Waiting for samples above trigger level';

    const buttonAttributes = {
        // [label, title, onClick]
        idleSingle: [
            LABEL_START,
            TITLE_IDLE,
            () => dispatch(triggerSingleSet()),
        ],
        idleContinuous: [
            LABEL_START,
            TITLE_IDLE,
            () => dispatch(triggerStart()),
        ],
        runningSingle: [
            LABEL_WAIT,
            TITLE_RUNNING,
            () => dispatch(triggerStop()),
        ],
        runningContinuous: [LABEL_STOP, null, () => dispatch(triggerStop())],
    };

    const isRunning = triggerRunning || triggerSingleWaiting;

    const [label, title, onClick] = getButtonValues({
        externalTrigger,
        isRunning,
        triggerMode,
        attrs: buttonAttributes,
    });

    return (
        <Button
            title={title}
            className={`w-100 mb-2 ${isRunning ? 'active-anim' : ''}`}
            disabled={!rttRunning || externalTrigger}
            variant="set"
            onClick={onClick}
        >
            {label}
        </Button>
    );
};

export default TriggerStart;

TriggerStart.propTypes = {
    triggerMode: PropTypes.string.isRequired,
    rttRunning: PropTypes.bool.isRequired,
};
