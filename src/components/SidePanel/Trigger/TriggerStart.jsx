/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import { unit } from 'mathjs';
import PropTypes from 'prop-types';

import {
    triggerSingleSet,
    triggerStart,
    triggerStop,
} from '../../../actions/deviceActions';
import { appState } from '../../../slices/appSlice';
import { triggerState } from '../../../slices/triggerSlice';
import { SINGLE } from './triggerConstants';

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

const TriggerStart = ({ triggerMode }) => {
    const dispatch = useDispatch();
    const { externalTrigger, triggerSingleWaiting, triggerRunning } =
        useSelector(triggerState);

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
            className={`w-100 start-stop trigger-btn ${
                isRunning ? 'active-anim' : ''
            }`}
            variant="set"
            onClick={onClick}
        >
            <span
                className={`mdi ${
                    isRunning ? 'mdi-stop-circle' : 'mdi-play-circle'
                }`}
            />
            {label}
        </Button>
    );
};

export default TriggerStart;

TriggerStart.propTypes = {
    triggerMode: PropTypes.string.isRequired,
};
