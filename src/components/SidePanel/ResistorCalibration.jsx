/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import {
    CollapsibleGroup,
    NumberInlineInput,
    Slider,
} from 'pc-nrfconnect-shared';
import { exact, func, number, string } from 'prop-types';

import { resetResistors, updateResistors } from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import {
    resistorCalibrationState,
    updateHighResistorAction,
    updateLowResistorAction,
    updateMidResistorAction,
} from '../../reducers/resistorCalibrationReducer';

const ResistorSlider = ({ id, label, value, range, actionOnChange }) => {
    const dispatch = useDispatch();

    return (
        <>
            <Form.Label htmlFor={id}>
                <span className="flex-fill">{label}</span>
                <NumberInlineInput
                    value={value}
                    range={range}
                    onChange={newValue => dispatch(actionOnChange(newValue))}
                    onChangeComplete={() => dispatch(updateResistors())}
                />
                <span className="mdi mdi-omega" />
            </Form.Label>
            <Slider
                id={id}
                values={[value]}
                range={range}
                onChange={[newValue => dispatch(actionOnChange(newValue))]}
                onChangeComplete={() => dispatch(updateResistors())}
            />
        </>
    );
};
ResistorSlider.propTypes = {
    id: string.isRequired,
    label: string.isRequired,
    value: number.isRequired,
    range: exact({
        min: number.isRequired,
        max: number.isRequired,
        decimals: number,
    }).isRequired,
    actionOnChange: func.isRequired,
};

const ResistorCalibration = () => {
    const dispatch = useDispatch();
    const { userResLo, userResMid, userResHi } = useSelector(
        resistorCalibrationState
    );
    const { capabilities } = useSelector(appState);

    if (!capabilities.ppkUpdateResistors) {
        return null;
    }

    return (
        <CollapsibleGroup
            heading="Resistor calibration"
            title="Fine tune resistor values of the measurement paths. See user guide for details."
        >
            <ResistorSlider
                id="slider-res-hi"
                label="High"
                value={userResHi}
                range={{ min: 1, max: 3, decimals: 3 }}
                actionOnChange={value =>
                    updateHighResistorAction({ userResHi: value })
                }
                chars={7}
            />
            <ResistorSlider
                id="slider-res-mid"
                label="Mid"
                value={userResMid}
                range={{ min: 25, max: 35, decimals: 3 }}
                actionOnChange={value =>
                    updateMidResistorAction({ userResMid: value })
                }
                chars={7}
            />
            <ResistorSlider
                id="slider-res-low"
                label="Low"
                value={userResLo}
                range={{ min: 450, max: 550, decimals: 3 }}
                actionOnChange={value =>
                    updateLowResistorAction({ userResLo: value })
                }
                chars={7}
            />
            <ButtonGroup className="mt-2 w-100">
                <Button
                    onClick={() => dispatch(updateResistors())}
                    variant="set"
                >
                    Update
                </Button>
                <Button
                    onClick={() => dispatch(resetResistors())}
                    variant="set"
                >
                    Reset
                </Button>
            </ButtonGroup>
        </CollapsibleGroup>
    );
};

export default ResistorCalibration;
