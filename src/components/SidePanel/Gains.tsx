/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup, Slider } from 'pc-nrfconnect-shared';

import { updateGains } from '../../actions/deviceActions';
import { appState } from '../../slices/appSlice';
import { gainsState, updateGainsAction } from '../../slices/gainsSlice';

const gainTitles = [
    '~100nA - 50µA',
    '~50µA - 500µA',
    '~500µA - 5mA',
    '~5mA - 60mA',
    '~60mA - 1A',
];

const Gains = () => {
    const dispatch = useDispatch();
    const gains = useSelector(gainsState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }

    const range = { min: 90, max: 110 };
    return (
        <CollapsibleGroup
            heading="Gains"
            title="Adjust gains to correct potential measurement errors"
        >
            {gains.map((gain, index) => (
                <React.Fragment key={`${index + 1}`}>
                    <Form.Label
                        title={gainTitles[index]}
                        className="d-flex justify-content-between flex-row pt-2"
                    >
                        <span>Range {index + 1}</span>
                        <span>{(gain / 100).toFixed(2)}</span>
                    </Form.Label>
                    <Slider
                        id={`slider-gains-${index}`}
                        title={gainTitles[index]}
                        values={[gain]}
                        range={range}
                        onChange={[
                            value =>
                                dispatch(
                                    updateGainsAction({ value, range: index })
                                ),
                        ]}
                        onChangeComplete={() => dispatch(updateGains(index))}
                    />
                </React.Fragment>
            ))}
        </CollapsibleGroup>
    );
};

export default Gains;
