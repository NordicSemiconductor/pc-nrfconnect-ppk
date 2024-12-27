/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Dropdown,
    DropdownItem,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    DigitalChannelTriggerState,
    DigitalChannelTriggerStatesEnum,
    getDigitalChannelsTriggersStates,
    setDigitalChannelsTriggersStates,
} from '../../slices/triggerSlice';

const dropdownItems: DropdownItem[] = [
    {
        value: DigitalChannelTriggerStatesEnum.Active,
        label: DigitalChannelTriggerStatesEnum.Active,
    },
    {
        value: DigitalChannelTriggerStatesEnum.Inactive,
        label: DigitalChannelTriggerStatesEnum.Inactive,
    },
    {
        value: DigitalChannelTriggerStatesEnum.DontCare,
        label: DigitalChannelTriggerStatesEnum.DontCare,
    },
];

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
        <div className="tw-flex tw-flex-col tw-gap-3">
            {digitalChannelTriggerStates.map((state, index) => (
                <div
                    key={`d-trigger-${index + 1}`}
                    className="tw-flex tw-flex-row tw-gap-3"
                >
                    <div>{`Digital channel ${index}:`}</div>
                    <Dropdown
                        onSelect={value => {
                            handleDigitalChannelsTriggerStateChange(
                                index,
                                value.value as DigitalChannelTriggerState
                            );
                        }}
                        items={dropdownItems}
                        selectedItem={
                            dropdownItems.find(item => item.value === state) ??
                            dropdownItems[0]
                        }
                    />
                </div>
            ))}
        </div>
    );
};
