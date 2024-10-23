/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Group, NumberInput } from '@nordicsemiconductor/pc-nrfconnect-shared';

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

export default () => {
    const dispatch = useDispatch();
    const gains = useSelector(gainsState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }

    return (
        <Group
            heading="Gains"
            title="Adjust gains to correct potential measurement errors"
            gap={4}
        >
            {gains.map((gain, index) => (
                <NumberInput
                    key={`${index + 1}`}
                    label={`Range ${index + 1} (${gainTitles[index]})`}
                    value={Number((gain / 100).toFixed(2))}
                    range={{ min: 0.9, max: 1.1, decimals: 2 }}
                    onChange={value => {
                        dispatch(
                            updateGainsAction({
                                value: value * 100,
                                range: index,
                            })
                        );
                    }}
                    onChangeComplete={() => dispatch(updateGains(index))}
                    showSlider
                />
            ))}
        </Group>
    );
};
