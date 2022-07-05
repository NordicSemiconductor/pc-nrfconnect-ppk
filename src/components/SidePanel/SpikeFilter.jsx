/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup, Slider } from 'pc-nrfconnect-shared';

import { updateSpikeFilter } from '../../actions/deviceActions';
import { appState } from '../../slices/appSlice';
import {
    resetSpikeFilterToDefaults,
    spikeFilterState,
    updateSpikeFilterAction,
} from '../../slices/spikeFilterSlice';

const SpikeFilter = () => {
    const dispatch = useDispatch();
    const { samples, alpha, alpha5 } = useSelector(spikeFilterState);
    const { capabilities } = useSelector(appState);
    if (!capabilities.ppkSetUserGains) {
        return null;
    }
    return (
        <CollapsibleGroup
            heading="Spike filter"
            title="Adjust how the software filters current spikes"
        >
            <Form.Label
                title="Number of samples after a dynamic range switch to apply filter"
                className="pt-2 d-flex flex-row justify-content-between"
            >
                <span>Samples to smooth</span>
                <span>{samples}</span>
            </Form.Label>
            <Slider
                id="slider-spike-samples"
                title="Number of samples after a dynamic range switch to apply filter"
                values={[samples]}
                range={{ min: 1, max: 10 }}
                onChange={[
                    value =>
                        dispatch(
                            updateSpikeFilterAction({
                                spikeFilter: { samples: value },
                            })
                        ),
                ]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label
                title="Higher values filter more aggressively"
                className="pt-2 d-flex flex-row justify-content-between"
            >
                <span>Coefficient for range 1-4</span>
                <span>{alpha}</span>
            </Form.Label>
            <Slider
                id="slider-spike-alpha"
                title="Higher values filter more aggressively"
                values={[alpha]}
                range={{ min: 0, max: 0.5, decimals: 2 }}
                onChange={[
                    value =>
                        dispatch(
                            updateSpikeFilterAction({
                                spikeFilter: { alpha: value },
                            })
                        ),
                ]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Form.Label
                title="Higher values filter more aggressively"
                className="pt-2 d-flex flex-row justify-content-between"
            >
                <span>Coefficient for range 5</span>
                <span>{alpha5}</span>
            </Form.Label>
            <Slider
                id="slider-spike-alpha5"
                title="Higher values filter more aggressively"
                values={[alpha5]}
                range={{ min: 0, max: 0.5, decimals: 2 }}
                onChange={[
                    value =>
                        dispatch(
                            updateSpikeFilterAction({
                                spikeFilter: { alpha5: value },
                            })
                        ),
                ]}
                onChangeComplete={() => dispatch(updateSpikeFilter())}
            />
            <Button
                onClick={() => {
                    dispatch(resetSpikeFilterToDefaults());
                    dispatch(updateSpikeFilter());
                }}
                variant="set"
                className="w-50 mb-2 mt-3"
            >
                Defaults
            </Button>
        </CollapsibleGroup>
    );
};

export default SpikeFilter;
