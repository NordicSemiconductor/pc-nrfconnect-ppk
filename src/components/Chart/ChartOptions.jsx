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

const unitLabels = ['\u00B5A', 'mA', 'A'];

const ChartOptions = () => {
    const { yMin, yMax, yAxisLock } = useSelector(chartState);
    const dispatch = useDispatch();
    const [localYMin, setLocalYMin] = useState(1);
    const [localYMax, setLocalYMax] = useState(1);

    /** Mapping to the power to get correct value of uA
     * 0=uA, 1=mA, 2=A
     */
    const [unitPowerYMax, setUnitPowerYMax] = useState(0);
    const [unitPowerYMin, setUnitPowerYMin] = useState(0);

    /**
     *
     * @param {number} uA the top value of the y axis
     * @returns {0 | 1 | 2} the power in which it is preferred to scale the y value
     */
    const getUnitPower = uA => {
        if (uA >= 1e6) {
            return 2;
        }
        if (uA > 1000) {
            return 1;
        }
        return 0;
    };

    /**
     * Dispatch the new yMax value and update unit
     * @param {bool} unit true if value is given in mA
     * @returns {void}
     */
    const dispatchYMax = unit => {
        dispatch(setYMax(localYMax * 1000 ** unit));
        setUnitPowerYMax(unit);
    };

    const dispatchYMin = unit => {
        dispatch(setYMin(localYMin * 1000 ** unit));
        setUnitPowerYMin(unit);
    };

    useEffect(() => {
        const power = getUnitPower(yMax);
        setUnitPowerYMax(power);
        const precisionResult = Number(yMax / 1000 ** power).toPrecision(4);
        const rawResult = Number(yMax / 1000 ** power);
        setLocalYMax(
            precisionResult.toString().length < rawResult.toString().length
                ? precisionResult
                : rawResult
        );
    }, [yMax]);

    useEffect(() => {
        const power = getUnitPower(yMin);
        setUnitPowerYMin(power);
        const precisionResult = Number(yMin / 1000 ** power).toPrecision(4);
        const rawResult = Number(yMin / 1000 ** power);
        setLocalYMin(
            precisionResult.toString().length < rawResult.toString().length
                ? precisionResult
                : rawResult
        );
    }, [yMin]);

    return (
        <Form.Label className="label-with-dropdown">
            FROM
            <NumberInlineInput
                value={localYMin}
                range={{
                    min: 0,
                    max: yMax,
                    decimals: 15,
                }}
                onChange={value => setLocalYMin(value)}
                onChangeComplete={() => dispatchYMin(unitPowerYMax)}
                disabled={!yAxisLock}
            />
            <UnitDropdown
                unit={unitPowerYMin}
                dispatchFunc={unit => dispatchYMin(unit)}
            />
            TO
            <NumberInlineInput
                value={localYMax}
                range={{
                    min: yMin || 0,
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
