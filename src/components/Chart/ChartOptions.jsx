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
import { NumberInlineInput, usageData } from 'pc-nrfconnect-shared';
import { func, number } from 'prop-types';

import {
    chartState,
    setYMax as storeYMax,
    setYMin as storeYMin,
} from '../../reducers/chartReducer';
import EventAction from '../../usageDataActions';

/** The power, p, to satisfy the mathematical expression:
 *  uA = x * 1000^p,
 *  where x is an arbitrary amount of ampere in one of the units.
 */
const UNIT_EXPONENT = {
    MICRO_AMPERE: 0,
    MILLI_AMPERE: 1,
    AMPERE: 2,
};
const UNIT_LABELS = ['\u00B5A', 'mA', 'A'];

const ChartOptions = () => {
    const {
        yMin: storedYMin,
        yMax: storedYMax,
        yAxisLock,
    } = useSelector(chartState);
    const dispatch = useDispatch();

    const [yMin, setYMin] = useState(1);
    const [yMax, setYMax] = useState(1);

    /** Mapping to the {UNIT_POWER} to satisfy transformation to and from uA */
    const [yMinExponent, setYMinExponent] = useState(
        UNIT_EXPONENT.MICRO_AMPERE
    );
    const [yMaxExponent, setYMaxExponent] = useState(
        UNIT_EXPONENT.MICRO_AMPERE
    );

    /** Get the appropriate exponent to decide what unit to use given the number of microAmpere, uA
     * @param {number} uA number av microAmpere
     * @returns {UNIT_EXPONENT} exponent to use for transforming to and from microAmpere
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

    /**
     * Transform and store the input yMin to uA
     * @param {UNIT_EXPONENT} exponent to use in transformation
     * @returns {void} dispatches new yMin to storage
     */
    const dispatchYMin = exponent => {
        dispatch({ yMin: storeYMin(yMin * 1000 ** exponent) });
        setYMinExponent(exponent);
        usageData.sendUsageData(EventAction.Y_MIN_SET_EXPLICITLY);
    };

    /**
     * Transform and store the input yMax to uA
     * @param {UNIT_EXPONENT} exponent to use in transformation
     * @returns {void} dispatches new yMax to storage
     */
    const dispatchYMax = exponent => {
        dispatch({ yMax: storeYMax(yMax * 1000 ** exponent) });
        setYMaxExponent(exponent);
        usageData.sendUsageData(EventAction.Y_MAX_SET_EXPLICITLY);
    };

    /** Get calculated value depending on unit
     * @param {number} initialNumber from storage in uA
     * @param {UNIT_EXPONENT} power, p, to satisfy: x = uA / 1000^p
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
        const unitPower = getUnitPower(storedYMin);
        setYMinExponent(unitPower);

        setYMin(getPrettyValue(storedYMin, unitPower));
    }, [storedYMin]);

    useEffect(() => {
        const unitPower = getUnitPower(storedYMax);
        setYMaxExponent(unitPower);
        setYMax(getPrettyValue(storedYMax, unitPower));
    }, [storedYMax]);

    return (
        <Form.Label className="label-with-dropdown">
            <span>FROM</span>
            <NumberInlineInput
                value={yMin}
                range={{
                    min: -Infinity,
                    max: storedYMax / 1000 ** yMinExponent,
                    decimals: 15,
                }}
                onChange={setYMin}
                onChangeComplete={() => dispatchYMin(yMinExponent)}
                disabled={!yAxisLock}
            />
            <UnitDropdown unit={yMinExponent} dispatchFunc={dispatchYMin} />
            <span>TO</span>
            <NumberInlineInput
                value={yMax}
                range={{
                    min: storedYMin / 1000 ** yMaxExponent,
                    max: Infinity,
                    decimals: 15,
                }}
                onChange={setYMax}
                onChangeComplete={() => dispatchYMax(yMaxExponent)}
                disabled={!yAxisLock}
            />
            <UnitDropdown unit={yMaxExponent} dispatchFunc={dispatchYMax} />
        </Form.Label>
    );
};

/**
 * Dropdown menu to select unit to input field.
 * @param {number} unit currently selected unit
 * @param {func} dispatchFunc function to dispatch new selected unit
 * @returns {component} Dropdown Component to select unit
 */
const UnitDropdown = ({ unit, dispatchFunc }) => (
    <SelectableContext.Provider value={false}>
        <Dropdown className="inline-dropdown">
            <Dropdown.Toggle className="dropdown-current-unit" variant="plain">
                {UNIT_LABELS[unit]}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item eventKey="1" onSelect={() => dispatchFunc(0)}>
                    {UNIT_LABELS[0]}
                </Dropdown.Item>
                <Dropdown.Item eventKey="2" onSelect={() => dispatchFunc(1)}>
                    {UNIT_LABELS[1]}
                </Dropdown.Item>
                <Dropdown.Item eventKey="3" onSelect={() => dispatchFunc(2)}>
                    {UNIT_LABELS[2]}
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    </SelectableContext.Provider>
);

UnitDropdown.propTypes = {
    unit: number.isRequired,
    dispatchFunc: func.isRequired,
};

export default ChartOptions;
