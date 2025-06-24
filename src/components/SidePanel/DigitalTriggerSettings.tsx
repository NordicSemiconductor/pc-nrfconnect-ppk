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
    DigitalChannelTriggerLogicOptions,
    DigitalChannelTriggerStatesEnum,
    getDigitalChannelsTriggerLogic,
    getDigitalChannelsTriggersStates,
    setDigitalChannelsTriggerLogic,
    setDigitalChannelsTriggersStates,
} from '../../slices/triggerSlice';
import { digitalChannelStateTupleOf8 } from '../../utils/persistentStore';

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
        <div className="tw-ml-px tw-mt-px">
            {digitalChannelTriggerStates.map((state, index) => (
                <div
                    className="tw-h-10x -tw-mt-px tw-flex tw-w-full tw-items-center tw-border tw-border-solid tw-border-gray-200"
                    key={`d-triggerr-${index + 1}`}
                >
                    <div className="tw-mr-1x -tw-ml-px tw-flex tw-h-8 tw-flex-1 tw-items-center tw-truncate">
                        <div className="dip-label-text tw-w-full tw-flex-1 tw-truncate tw-pl-1">
                            Channel {index}
                        </div>
                    </div>
                    <div className="tw-p-1x -tw-ml-px tw-flex tw-h-8 tw-w-1/2 tw-flex-none tw-items-center">
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
            />
        </>
    );
};
