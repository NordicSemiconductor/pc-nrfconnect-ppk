/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import FormLabel from 'react-bootstrap/FormLabel';
import { useDispatch, useSelector } from 'react-redux';
import {
    CollapsibleGroup,
    NumberInlineInput,
    Slider,
    usageData,
} from 'pc-nrfconnect-shared';

import {
    isConnectedToPPK1Device,
    updateRegulator,
} from '../../actions/deviceActions';
import {
    moveVoltageRegulatorVdd,
    updateVoltageRegulatorMaxCapPPK1,
    updateVoltageRegulatorMaxCapPPK2,
    voltageRegulatorState,
} from '../../slices/voltageRegulatorSlice';
import EventAction from '../../usageDataActions';

export const CapVoltageSettings = () => {
    const { min, max, vdd, maxCap } = useSelector(voltageRegulatorState);
    const [newMaxCap, setNewMaxCap] = useState(maxCap);
    const dispatch = useDispatch();

    const updateMaxCap = () =>
        isConnectedToPPK1Device()
            ? dispatch(updateVoltageRegulatorMaxCapPPK1(newMaxCap))
            : dispatch(updateVoltageRegulatorMaxCapPPK2(newMaxCap));

    const updateVoltageRegulator = () => {
        updateMaxCap();
        if (newMaxCap < vdd) {
            dispatch(moveVoltageRegulatorVdd(newMaxCap));
            dispatch(updateRegulator());
        }
    };

    return (
        <CollapsibleGroup
            heading="Voltage Limit"
            title="Adjust to limit voltage supply"
            className="cap-voltage-regulator-container"
            defaultCollapsed={false}
        >
            <div
                className="voltage-regulator"
                title="Supply voltage to the device will be capped to this value"
            >
                <FormLabel htmlFor="cap-slider-vdd">
                    <span className="flex-fill">Set max supply voltage to</span>
                    <NumberInlineInput
                        value={newMaxCap}
                        range={{ min, max }}
                        onChange={value => setNewMaxCap(value)}
                        onChangeComplete={() => {
                            updateVoltageRegulator();
                            usageData.sendUsageData(
                                EventAction.VOLTAGE_MAX_LIMIT_CHANGED,
                                `${newMaxCap}`
                            );
                        }}
                    />
                    &nbsp;mV
                </FormLabel>
                <Slider
                    id="cap-slider-vdd"
                    values={[newMaxCap]}
                    range={{ min, max }}
                    onChange={[value => setNewMaxCap(value)]}
                    onChangeComplete={() => {
                        updateVoltageRegulator();
                        usageData.sendUsageData(
                            EventAction.VOLTAGE_MAX_LIMIT_CHANGED,
                            `${newMaxCap}`
                        );
                    }}
                />
            </div>
        </CollapsibleGroup>
    );
};
