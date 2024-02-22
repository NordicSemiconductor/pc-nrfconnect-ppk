/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NumberInput } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { updateRegulator } from '../../actions/deviceActions';
import { appState } from '../../slices/appSlice';
import {
    moveVoltageRegulatorVdd,
    voltageRegulatorState,
} from '../../slices/voltageRegulatorSlice';

export default () => {
    const dispatch = useDispatch();
    const { vdd, min, maxCap: max } = useSelector(voltageRegulatorState);
    const {
        isSmuMode,
        capabilities: { ppkSetPowerMode },
    } = useSelector(appState);

    const isVoltageSettable = !ppkSetPowerMode || isSmuMode;

    useEffect(() => {
        if (vdd > max) {
            dispatch(moveVoltageRegulatorVdd(max));
        }
    }, [vdd, max, dispatch]);

    return isVoltageSettable ? (
        <NumberInput
            label="Set supply voltage to"
            value={vdd}
            showSlider
            unit="mV"
            range={{ min, max }}
            onChange={value => {
                dispatch(moveVoltageRegulatorVdd(value));
            }}
            onChangeComplete={() => dispatch(updateRegulator())}
        />
    ) : null;
};
