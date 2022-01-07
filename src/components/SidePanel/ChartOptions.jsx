/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup, NumberInlineInput } from 'pc-nrfconnect-shared';

import {
    getYValueState,
    yAxisChangedAction,
} from '../../reducers/chartReducer';

const units = [
    { label: '\u00B5A', factor: 1 },
    { label: 'mA', factor: 1e3 },
    { label: 'A', factor: 1e6 },
];

const ChartOptions = () => {
    const [yMin, yMax] = useSelector(getYValueState);
    const dispatch = useDispatch();

    const [yMinLocal, setYMinLocal] = useState(yMin);
    const [yMaxLocal, setYMaxLocal] = useState(yMax);
    const [upperBoundObject, setNewUpperBoundObject] = useState(units[0]);
    const [lowerBoundObject, setNewLowerBoundObject] = useState(units[0]);
    const [upperBoundFactor, setUpperBoundFactor] = useState(units[0].factor);
    const [lowerBoundFactor, setLowerBoundFactor] = useState(units[0].factor);

    const formatUpperBoundForDisplay = value => value / upperBoundFactor;
    const formatLowerBoundForDisplay = value => value / lowerBoundFactor;

    useEffect(() => {
        setUpperBoundFactor(upperBoundObject.factor);
    }, [upperBoundObject]);
    useEffect(() => {
        setLowerBoundFactor(lowerBoundObject.factor);
    }, [lowerBoundObject]);

    return (
        <CollapsibleGroup
            heading="Chart Options"
            title="Adjust to change layout of graph"
            className="chart-options-sidepanel"
            defaultCollapsed={false}
        >
            <div className="voltage-regulator" title="Adjust y-axis parameters">
                <Form.Label
                    htmlFor="number-inline-ymax"
                    className="label-with-dropdown"
                >
                    <span className="flex-fill">Top of y-axis</span>
                    <NumberInlineInput
                        value={formatUpperBoundForDisplay(yMaxLocal)}
                        range={{
                            min: yMinLocal / upperBoundFactor,
                            max: Infinity,
                            decimals: 15,
                        }}
                        onChange={max => setYMaxLocal(max * upperBoundFactor)}
                        onChangeComplete={max =>
                            dispatch(
                                yAxisChangedAction(yMin, max * upperBoundFactor)
                            )
                        }
                    />
                    <Dropdown className="inline-dropdown">
                        <Dropdown.Toggle variant="plain">
                            {upperBoundObject.label}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {units.map((unit, index) => (
                                <Dropdown.Item
                                    key={`upper-y-${unit.label}`}
                                    eventKey={`event-${index}`}
                                    onSelect={() =>
                                        setNewUpperBoundObject(unit)
                                    }
                                >
                                    {`${unit.label}`}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </Form.Label>
                <Form.Label
                    htmlFor="number-inline-ymin"
                    className="label-with-dropdown"
                >
                    <span className="flex-fill">Bottom of y-axis</span>
                    <NumberInlineInput
                        value={formatLowerBoundForDisplay(
                            yMinLocal * lowerBoundFactor
                        )}
                        range={{
                            min: -Infinity,
                            max: yMaxLocal / lowerBoundFactor,
                            decimals: 15,
                        }}
                        onChange={min => setYMinLocal(min)}
                        onChangeComplete={min =>
                            dispatch(
                                yAxisChangedAction(min * lowerBoundFactor, yMax)
                            )
                        }
                    />
                    <Dropdown className="inline-dropdown">
                        <Dropdown.Toggle variant="plain">
                            {lowerBoundObject.label}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {units.map((unit, index) => (
                                <Dropdown.Item
                                    key={`lower-y-${unit.label}`}
                                    eventKey={`event-${index}`}
                                    onSelect={() =>
                                        setNewLowerBoundObject(unit)
                                    }
                                >
                                    {`${unit.label}`}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </Form.Label>
            </div>
        </CollapsibleGroup>
    );
};

export default ChartOptions;
