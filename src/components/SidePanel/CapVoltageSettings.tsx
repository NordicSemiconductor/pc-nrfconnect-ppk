/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
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

export const useSynchronizationIfChangedFromOutside = <T,>(
    externalValue: T,
    setInternalValue: (value: T) => void
) => {
    const previousExternalValue = useRef(externalValue);
    useEffect(() => {
        if (previousExternalValue.current !== externalValue) {
            setInternalValue(externalValue);
            previousExternalValue.current = externalValue;
        }
    });
    return previousExternalValue.current;
};

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

    useSynchronizationIfChangedFromOutside(maxCap, setNewMaxCap);

    return (
        <Group
            heading="Voltage Limit"
            title="Adjust to limit voltage supply"
            className="cap-voltage-regulator-container"
            gap={4}
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
