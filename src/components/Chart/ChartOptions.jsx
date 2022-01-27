/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import SelectableContext from 'react-bootstrap/SelectableContext';
import { useDispatch, useSelector } from 'react-redux';
import { NumberInlineInput } from 'pc-nrfconnect-shared';
import { func, number } from 'prop-types';

import { chartState, setYMax, setYMin } from '../../reducers/chartReducer';

const UNIT_LABELS = ['\u00B5A', 'mA', 'A'];

const ChartOptions = () => {
    const { yMin, yMax, yAxisLock } = useSelector(chartState);
    const dispatch = useDispatch();

    const [localYMin, setLocalYMin] = useState(1);
    const [localYMax, setLocalYMax] = useState(1);

    /** Mapping to the power to get correct value of uA
     * 0=uA, 1=mA, 2=A
     */
    const [unitPowerYMin, setUnitPowerYMin] = useState(0);
    const [unitPowerYMax, setUnitPowerYMax] = useState(0);

    /** Get the unit power
     * @param {number} uA number av microAmpere
     * @returns {0 | 1 | 2} the power in which it is preferred to scale the y value
     */
    const getUnitPower = uA => {
        const absoluteValue = Math.abs(uA);
        if (absoluteValue >= 1e6) {
            return 2;
        }
        if (absoluteValue > 1000) {
            return 1;
        }
        return 0;
    };

    const dispatchYMin = powerUnit => {
        dispatch(setYMin(localYMin * 1000 ** powerUnit));
        setUnitPowerYMin(powerUnit);
    };

    const dispatchYMax = powerUnit => {
        dispatch(setYMax(localYMax * 1000 ** powerUnit));
        setUnitPowerYMax(powerUnit);
    };

    /** Get calculated value depending on unit
     * @param {number} initialNumber yMin or yMax to make more readable
     * @param {number} power the power to reduce depending on unit
     * @param {number} precision maximal number of decimals to display
     * @returns {number} initialNumber/1000**power with precision number of decimals
     */
    const getPrettyValue = (initialNumber, power, precision = 4) => {
        const rawResult = Number(initialNumber / 1000 ** power);
        const precisionResult = rawResult.toPrecision(precision);

        if (precisionResult.toString().length < rawResult.toString().length) {
            return precisionResult;
        }
        return rawResult;
    };

    useEffect(() => {
        const unitPower = getUnitPower(yMin);
        setUnitPowerYMin(unitPower);

        setLocalYMin(getPrettyValue(yMin, unitPower));
    }, [yMin]);

    useEffect(() => {
        const unitPower = getUnitPower(yMax);
        setUnitPowerYMax(unitPower);
        setLocalYMax(getPrettyValue(yMax, unitPower));
    }, [yMax]);

    return (
        <Form.Label className="label-with-dropdown">
            <span>FROM</span>
            <NumberInlineInput
                value={localYMin}
                range={{
                    min: -Infinity,
                    max: (yMax * 1000 ** unitPowerYMax) / 1000 ** unitPowerYMin,
                    decimals: 15,
                }}
                onChange={value => setLocalYMin(value)}
                onChangeComplete={() => dispatchYMin(unitPowerYMin)}
                disabled={!yAxisLock}
            />
            <UnitDropdown
                unit={unitPowerYMin}
                dispatchFunc={unit => dispatchYMin(unit)}
            />
            <span>TO</span>
            <NumberInlineInput
                value={localYMax}
                range={{
                    min: (yMin * 1000 ** unitPowerYMin) / 1000 ** unitPowerYMax,
                    max: Infinity,
                    decimals: 15,
                }}
                onChange={value => setLocalYMax(value)}
                onChangeComplete={() => dispatchYMax(unitPowerYMax)}
                disabled={!yAxisLock}
            />
            <UnitDropdown
                unit={unitPowerYMax}
                dispatchFunc={unit => dispatchYMax(unit)}
            />
        </Form.Label>
    );
};

/**
 * Dropdown menu to select unit to input field.
 * @param {number} unit which is currently selected.
 * @param {func} dispatchFunc function to dispatch new selected unit.
 * @returns {component} Dropdown component
 */
const UnitDropdown = ({ unit, dispatchFunc }) => {
    return (
        <SelectableContext.Provider value={false}>
            <Dropdown className="inline-dropdown">
                <Dropdown.Toggle
                    className="dropdown-current-unit"
                    variant="plain"
                >
                    {unitLabels[unit]}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item
                        eventKey="1"
                        onSelect={() => dispatchFunc(0)}
                    >
                        {unitLabels[0]}
                    </Dropdown.Item>
                    <Dropdown.Item
                        eventKey="2"
                        onSelect={() => dispatchFunc(1)}
                    >
                        {unitLabels[1]}
                    </Dropdown.Item>
                    <Dropdown.Item
                        eventKey="3"
                        onSelect={() => dispatchFunc(2)}
                    >
                        {unitLabels[2]}
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </SelectableContext.Provider>
    );
};

UnitDropdown.propTypes = {
    unit: number.isRequired,
    dispatchFunc: func.isRequired,
};

export default ChartOptions;
