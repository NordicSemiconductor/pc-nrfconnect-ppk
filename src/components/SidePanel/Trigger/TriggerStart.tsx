/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import { unit } from 'mathjs';

import {
    triggerSingleSet,
    triggerStart,
    triggerStop,
} from '../../../actions/deviceActions';
import { appState } from '../../../slices/appSlice';
import { triggerState } from '../../../slices/triggerSlice';
import { SINGLE } from './triggerConstants';

interface ButtonAttributes {
    idleSingle: [string, string, () => void];
    idleContinuous: [string, string, () => void];
    runningSingle: [string, string, () => void];
    runningContinuous: [string, null, () => void];
}

interface GetButtonValues {
    isRunning: boolean;
    triggerMode: string;
    attrs: ButtonAttributes;
}

const getButtonValues = ({
    isRunning,
    triggerMode,
    attrs,
}: GetButtonValues) => {
    if (isRunning) {
        return triggerMode === SINGLE
            ? attrs.runningSingle
            : attrs.runningContinuous;
    }
    return triggerMode === SINGLE ? attrs.idleSingle : attrs.idleContinuous;
};

export default ({ triggerMode }: { triggerMode: string }) => {
    const dispatch = useDispatch();
    const { triggerSingleWaiting, triggerRunning } = useSelector(triggerState);

    const { capabilities } = useSelector(appState);

    let formattedFreq: string;
    if (capabilities?.samplingTimeUs == null) {
        formattedFreq = 'N/A';
    } else {
        formattedFreq = unit(1e6 / capabilities.samplingTimeUs, 'Hz').format({
            notation: 'fixed',
            precision: 0,
        });
    }

    const LABEL_START = 'Start';
    const LABEL_STOP = 'Stop';
    const LABEL_WAIT = 'Wait';
    const TITLE_IDLE = `Start sampling at ${formattedFreq} for a short duration when the set trigger level is reached`;
    const TITLE_RUNNING = 'Waiting for samples above trigger level';

    const buttonAttributes: ButtonAttributes = {
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
        isRunning,
        triggerMode,
        attrs: buttonAttributes,
    });

    return (
        <Button
            title={title ?? ''}
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
