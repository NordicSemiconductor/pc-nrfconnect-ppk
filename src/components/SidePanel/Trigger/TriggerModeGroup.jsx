/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';

import { triggerStop } from '../../../actions/deviceActions';
import { CONTINUOUS, SINGLE } from './triggerConstants';

const TriggerModeGroup = ({ triggerMode, setTriggerMode, triggerRunning }) => {
    const dispatch = useDispatch();
    const setSingleTriggerMode = () => {
        if (triggerRunning && triggerMode === CONTINUOUS) {
            dispatch(triggerStop());
        }
        setTriggerMode(SINGLE);
    };

    const setContinuousTriggerMode = () => {
        setTriggerMode(CONTINUOUS);
    };

    return (
        <ButtonGroup className="w-100 trigger-mode d-flex mb-2 flex-row">
            <Button
                title="Sample once"
                disabled={triggerMode === SINGLE}
                variant={triggerMode === SINGLE ? 'set' : 'unset'}
                onClick={setSingleTriggerMode}
            >
                Single
            </Button>
            <Button
                title="Sample until stopped by user"
                disabled={triggerMode === CONTINUOUS}
                variant={triggerMode === CONTINUOUS ? 'set' : 'unset'}
                onClick={setContinuousTriggerMode}
            >
                Continuous
            </Button>
        </ButtonGroup>
    );
};

export default TriggerModeGroup;

TriggerModeGroup.propTypes = {
    triggerMode: PropTypes.string.isRequired,
    setTriggerMode: PropTypes.func.isRequired,
    triggerRunning: PropTypes.bool.isRequired,
};
