import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import { options } from '../../../globals';
import { triggerState } from '../../../reducers/triggerReducer';
import {
    triggerStart,
    triggerStop,
    triggerSingleSet,
} from '../../../actions/deviceActions';
import { SINGLE } from './constants';

const TriggerStart = ({ triggerMode, rttRunning, triggerRunning }) => {
    const dispatch = useDispatch();
    const { externalTrigger, triggerSingleWaiting } = useSelector(triggerState);

    let startLabel = 'External';
    let startTitle;
    let onStartClicked = null;

    if (!externalTrigger) {
        if (!(triggerRunning || triggerSingleWaiting)) {
            startLabel = 'Start';
            startTitle = `Start sampling at ${Math.round(
                options.samplesPerSecond / 1000
            )}kHz for a short duration when the set trigger level is reached`;
            if (triggerMode === SINGLE) {
                onStartClicked = () => dispatch(triggerSingleSet());
            } else {
                onStartClicked = () => dispatch(triggerStart());
            }
        } else {
            onStartClicked = () => dispatch(triggerStop());
            if (triggerMode === SINGLE) {
                startLabel = 'Wait';
                startTitle = 'Waiting for samples above trigger level';
            } else {
                startLabel = 'Stop';
            }
        }
    }
    return (
        <Button
            title={startTitle}
            className={`w-100 mb-2 ${
                triggerRunning || triggerSingleWaiting ? 'active-anim' : ''
            }`}
            disabled={!rttRunning || externalTrigger}
            variant="set"
            onClick={onStartClicked}
        >
            {startLabel}
        </Button>
    );
};

export default TriggerStart;

TriggerStart.propTypes = {
    triggerMode: PropTypes.string.isRequired,
    rttRunning: PropTypes.bool.isRequired,
    triggerRunning: PropTypes.bool.isRequired,
};
