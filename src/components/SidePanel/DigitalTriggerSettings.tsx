/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
    DigitalChannelTriggerState,
    DigitalChannelTriggerStatesEnum,
    getDigitalChannelsTriggersStates,
    setDigitalChannelsTriggersStates,
} from '../../slices/triggerSlice';

export default () => {
    const dispatch = useDispatch();
    const digitalChannelTriggerStates = useSelector(
        getDigitalChannelsTriggersStates
    );

    const handleDigitalChannelsTriggerStateChange = (
        index: number,
        state: DigitalChannelTriggerState
    ) => {
        const newStates = [...digitalChannelTriggerStates];
        newStates[index] = state;
        dispatch(
            setDigitalChannelsTriggersStates({
                digitalChannelsTriggers: newStates,
            })
        );
    };

    return (
        <div className="tw-flex tw-flex-col tw-gap-0.5">
            {digitalChannelTriggerStates.map((state, index) => (
                <div
                    key={`d-trigger-${index + 1}`}
                    className="tw-flex tw-flex-row tw-gap-3"
                >
                    <span>{`Digital channel ${index}:`}</span>
                    <select
                        value={state}
                        onChange={e => {
                            handleDigitalChannelsTriggerStateChange(
                                index,
                                e.target.value as DigitalChannelTriggerState
                            );
                        }}
                    >
                        <option value={DigitalChannelTriggerStatesEnum.Active}>
                            {DigitalChannelTriggerStatesEnum.Active}
                        </option>
                        <option
                            value={DigitalChannelTriggerStatesEnum.Inactive}
                        >
                            {DigitalChannelTriggerStatesEnum.Inactive}
                        </option>
                        <option
                            value={DigitalChannelTriggerStatesEnum.DontCare}
                        >
                            {DigitalChannelTriggerStatesEnum.DontCare}
                        </option>
                    </select>
                </div>
            ))}
        </div>
    );
};
