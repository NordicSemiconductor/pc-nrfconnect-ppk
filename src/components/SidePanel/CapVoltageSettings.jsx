/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import {
    CollapsibleGroup,
    NumberInlineInput,
    Slider,
    usageData,
} from 'pc-nrfconnect-shared';

import {
    updateVoltageRegulatorMaxCapAction,
    voltageRegulatorState,
} from '../../reducers/voltageRegulatorReducer';
import EventAction from '../../usageDataActions';

export const CapVoltageSettings = () => {
    const { min, max, maxCap } = useSelector(voltageRegulatorState);
    const dispatch = useDispatch();

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
                <Form.Label htmlFor="cap-slider-vdd">
                    <span className="flex-fill">Set max supply voltage to</span>
                    <NumberInlineInput
                        value={maxCap}
                        range={{ min, max }}
                        onChange={value =>
                            dispatch(
                                updateVoltageRegulatorMaxCapAction({
                                    maxCap: value,
                                })
                            )
                        }
                        onChangeComplete={() => {
                            dispatch(
                                updateVoltageRegulatorMaxCapAction({ maxCap })
                            );
                            usageData.sendUsageData(
                                EventAction.VOLTAGE_MAX_LIMIT_CHANGED,
                                maxCap
                            );
                        }}
                    />
                    &nbsp;mV
                </Form.Label>
                <Slider
                    id="cap-slider-vdd"
                    values={[maxCap]}
                    range={{ min, max }}
                    onChange={[
                        value =>
                            dispatch(
                                updateVoltageRegulatorMaxCapAction({
                                    maxCap: value,
                                })
                            ),
                    ]}
                    onChangeComplete={() => {
                        dispatch(
                            updateVoltageRegulatorMaxCapAction({ maxCap })
                        );
                        usageData.sendUsageData(
                            EventAction.VOLTAGE_MAX_LIMIT_CHANGED,
                            maxCap
                        );
                    }}
                />
            </div>
        </CollapsibleGroup>
    );
};
