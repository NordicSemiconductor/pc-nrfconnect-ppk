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

import { chartState, scaleChartYAxisAction } from '../../reducers/chartReducer';

const unitLabels = ['\u00B5A', 'mA', 'A'];

const ChartOptions = () => {
    const { yMin, yMax, yAxisLock } = useSelector(chartState);
    const dispatch = useDispatch();
    const [localYMax, setLocalYMax] = useState(1);

    /** Mapping to the power to get correct value of uA
     * 0=uA, 1=mA, 2=A
     */
    const [unitPower, setUnitPower] = useState(0);

    useEffect(() => {
        const power = getUnitPower(yMax);
        setUnitPower(power);
        const precisionResult = Number(yMax / 1000 ** power).toPrecision(4);
        const rawResult = Number(yMax / 1000 ** power);
        setLocalYMax(
            precisionResult.toString().length < rawResult.toString().length
                ? precisionResult
                : rawResult
        );
    }, [yMax]);

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
        dispatch(scaleChartYAxisAction(localYMax * 1000 ** unit));
        setUnitPower(unit);
    };

    return (
        <Form.Label className="label-with-dropdown">
            <NumberInlineInput
                value={localYMax}
                range={{
                    min: yMin || 0,
                    max: Infinity,
                    decimals: 15,
                }}
                onChange={value => setLocalYMax(value)}
                onChangeComplete={() => dispatchYMax(unitPower)}
                disabled={!yAxisLock}
            />
            <SelectableContext.Provider value={false}>
                <Dropdown className="inline-dropdown">
                    <Dropdown.Toggle
                        className="dropdown-current-unit"
                        variant="plain"
                    >
                        {unitLabels[unitPower]}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item
                            eventKey="1"
                            onSelect={() => dispatchYMax(0)}
                        >
                            {unitLabels[0]}
                        </Dropdown.Item>
                        <Dropdown.Item
                            eventKey="2"
                            onSelect={() => dispatchYMax(1)}
                        >
                            {unitLabels[1]}
                        </Dropdown.Item>
                        <Dropdown.Item
                            eventKey="3"
                            onSelect={() => dispatchYMax(2)}
                        >
                            {unitLabels[2]}
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </SelectableContext.Provider>
        </Form.Label>
    );
};

export default ChartOptions;
