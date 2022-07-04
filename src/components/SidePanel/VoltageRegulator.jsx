/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import BootstrapCollapse from 'react-bootstrap/Collapse';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { NumberInlineInput, Slider } from 'pc-nrfconnect-shared';

import { updateRegulator } from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import {
    moveVoltageRegulatorVddAction,
    voltageRegulatorState,
} from '../../reducers/voltageRegulatorReducer';

const VoltageRegulator = () => {
    const dispatch = useDispatch();
    const { vdd, min, maxCap: max } = useSelector(voltageRegulatorState);
    const {
        isSmuMode,
        capabilities: { ppkSetPowerMode },
    } = useSelector(appState);

    const isVoltageSettable = !ppkSetPowerMode || isSmuMode;

    useEffect(() => {
        if (vdd > max) {
            dispatch(moveVoltageRegulatorVddAction({ vdd: max }));
        }
    }, [vdd, max, dispatch]);

    return (
        <BootstrapCollapse in={isVoltageSettable}>
            <div className="voltage-regulator">
                <Form.Label htmlFor="slider-vdd">
                    <span className="flex-fill">Set supply voltage to</span>
                    <NumberInlineInput
                        value={vdd}
                        range={{ min, max }}
                        onChange={value =>
                            dispatch(
                                moveVoltageRegulatorVddAction({ vdd: value })
                            )
                        }
                        onChangeComplete={() => dispatch(updateRegulator(vdd))}
                    />{' '}
                    mV
                </Form.Label>
                <Slider
                    id="slider-vdd"
                    values={[vdd]}
                    range={{ min, max }}
                    onChange={[
                        value =>
                            dispatch(
                                moveVoltageRegulatorVddAction({ vdd: value })
                            ),
                    ]}
                    onChangeComplete={() => dispatch(updateRegulator(vdd))}
                />
            </div>
        </BootstrapCollapse>
    );
};

export default VoltageRegulator;
