/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Group, NumberInput } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { updateSpikeFilter } from '../../actions/deviceActions';
import { appState } from '../../slices/appSlice';
import {
    spikeFilterState,
    updateSpikeFilterAction,
} from '../../slices/spikeFilterSlice';

export default () => {
    const dispatch = useDispatch();
    const { samples, alpha, alpha5 } = useSelector(spikeFilterState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }
    return (
        <Group
            heading="Spike filter"
            title="Adjust how the software filters current spikes"
            gap={4}
        >
            <NumberInput
                label="Samples to smooth"
                range={{ min: 1, max: 10 }}
                title="Number of samples after a dynamic range switch to apply filter"
                value={samples}
                onChange={value => {
                    dispatch(
                        updateSpikeFilterAction({
                            spikeFilter: { samples: value },
                        })
                    );
                }}
                showSlider
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <NumberInput
                label="Coefficient for range 1-4"
                range={{ min: 0, max: 0.5, decimals: 2 }}
                title="Higher values filter more aggressively"
                value={alpha}
                onChange={value => {
                    dispatch(
                        updateSpikeFilterAction({
                            spikeFilter: { alpha: value },
                        })
                    );
                }}
                showSlider
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <NumberInput
                label="Coefficient for range 5"
                range={{ min: 0, max: 0.5, decimals: 2 }}
                title="Higher values filter more aggressively"
                value={alpha5}
                onChange={value => {
                    dispatch(
                        updateSpikeFilterAction({
                            spikeFilter: { alpha5: value },
                        })
                    );
                }}
                showSlider
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
        </Group>
    );
};
