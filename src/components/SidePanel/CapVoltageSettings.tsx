/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Group,
    NumberInput,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { updateRegulator } from '../../actions/deviceActions';
import {
    moveVoltageRegulatorVdd,
    updateVoltageRegulatorMaxCapPPK2,
    voltageRegulatorState,
} from '../../slices/voltageRegulatorSlice';
import EventAction from '../../usageDataActions';

export const CapVoltageSettings = () => {
    const { min, max, vdd, maxCap } = useSelector(voltageRegulatorState);
    const [newMaxCap, setNewMaxCap] = useState(maxCap);
    const dispatch = useDispatch();

    const updateMaxCap = () =>
        dispatch(updateVoltageRegulatorMaxCapPPK2(newMaxCap));

    const updateVoltageRegulator = () => {
        updateMaxCap();
        if (newMaxCap < vdd) {
            dispatch(moveVoltageRegulatorVdd(newMaxCap));
            dispatch(updateRegulator());
        }
    };

    return (
        <Group
            heading="Voltage Limit"
            title="Adjust to limit voltage supply"
            className="cap-voltage-regulator-container"
        >
            <NumberInput
                title="Supply voltage to the device will be capped to this value"
                label="Set max supply voltage to"
                value={newMaxCap}
                range={{ min, max }}
                onChange={value => setNewMaxCap(value)}
                onChangeComplete={() => {
                    updateVoltageRegulator();
                    telemetry.sendEvent(EventAction.VOLTAGE_MAX_LIMIT_CHANGED, {
                        maxCap: newMaxCap,
                    });
                }}
                showSlider
                unit="mV"
            />
        </Group>
    );
};
