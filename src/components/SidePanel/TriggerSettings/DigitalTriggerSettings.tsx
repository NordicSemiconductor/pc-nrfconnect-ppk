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
    StateSelector,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    DigitalChannelTriggerStatesEnum,
    getDigitalChannelsTriggerLogic,
    getDigitalChannelsTriggersStates,
    setDigitalChannelsTriggerLogic,
    setDigitalChannelsTriggersStates,
} from '../../../slices/triggerSlice';
import { digitalChannelStateTupleOf8 } from '../../../utils/persistentStore';

const dropdownItems: DropdownItem[] = Object.entries(
    DigitalChannelTriggerStatesEnum
).map(([key, value]) => ({
    value,
    label: key,
}));

const ChannelsList = () => {
    const digitalChannelTriggerStates = useSelector(
        getDigitalChannelsTriggersStates
    );
    const dispatch = useDispatch();

    const handleDigitalChannelsTriggerStateChange = (
        index: number,
        state: DigitalChannelTriggerStatesEnum
    ) => {
        const newStates = [
            ...digitalChannelTriggerStates,
        ] as digitalChannelStateTupleOf8;
        newStates[index] = state;
        dispatch(
            setDigitalChannelsTriggersStates({
                digitalChannelsTriggers: newStates,
            })
        );
    };

    return (
        <div className="tw-flex tw-flex-col tw-border tw-border-solid tw-border-gray-200">
            {digitalChannelTriggerStates.map((state, index) => (
                <div
                    className="tw-flex tw-flex-row tw-items-center tw-border tw-border-l-0 tw-border-r-0 tw-border-t-0 tw-border-solid tw-border-gray-200 last:tw-border-b-0"
                    key={`d-triggerr-${index + 1}`}
                >
                    <div className="tw-w-1/2 tw-pl-2 tw-text-[10px]">
                        Channel {index}
                    </div>
                    <div className="tw-w-1/2">
                        <Dropdown
                            onSelect={value => {
                                handleDigitalChannelsTriggerStateChange(
                                    index,
                                    value.value as DigitalChannelTriggerStatesEnum
                                );
                            }}
                            items={dropdownItems}
                            selectedItem={
                                dropdownItems.find(
                                    item => item.value === state
                                ) ?? dropdownItems[0]
                            }
                            size="sm"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

const digitalChannelTriggerLogicOptions = [
    {
        key: 'AND',
        renderItem: 'AND',
        title: 'Trigger only when all selected conditions are met at the same time',
    },
    {
        key: 'OR',
        renderItem: 'OR',
        title: 'Trigger when at least one of the selected conditions is met',
    },
];

export default () => {
    const dispatch = useDispatch();
    const digitalChannelTriggerLogic = useSelector(
        getDigitalChannelsTriggerLogic
    );

    return (
        <>
            <ChannelsList />
            <StateSelector
                items={[...digitalChannelTriggerLogicOptions]}
                onSelect={m =>
                    dispatch(
                        setDigitalChannelsTriggerLogic(
                            digitalChannelTriggerLogicOptions[m].key as
                                | 'AND'
                                | 'OR'
                        )
                    )
                }
                selectedItem={digitalChannelTriggerLogic}
                size="sm"
            />
        </>
    );
};
