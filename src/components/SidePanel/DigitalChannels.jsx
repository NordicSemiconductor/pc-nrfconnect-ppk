/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import { useDispatch, useSelector } from 'react-redux';

import { chartState, setDigitalChannels } from '../../reducers/chartReducer';

import './digital-channels.scss';

export default () => {
    const dispatch = useDispatch();
    const { digitalChannels, hasDigitalChannels } = useSelector(chartState);

    if (!hasDigitalChannels) {
        return null;
    }

    const value = digitalChannels.reduce((a, v, i) => {
        if (v) a.push(i);
        return a;
    }, []);

    const toggle = i => {
        const channels = [...digitalChannels];
        channels[i] = !channels[i];
        dispatch(setDigitalChannels(channels));
    };

    return (
        <ToggleButtonGroup
            className="digital-channels"
            type="checkbox"
            value={value}
        >
            {digitalChannels.map((channel, i) => (
                <ToggleButton
                    key={`d${i + 1}`}
                    checked={channel}
                    variant={channel ? 'set' : 'unset'}
                    className="channel"
                    value={i}
                    onChange={() => toggle(i)}
                    active
                >
                    {i}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );
};
