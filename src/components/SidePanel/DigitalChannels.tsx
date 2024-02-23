/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { classNames } from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    getChartDigitalChannelInfo,
    setDigitalChannels,
} from '../../slices/chartSlice';
import { booleanTupleOf8 } from '../../utils/persistentStore';

import './digital-channels.scss';

export default () => {
    const dispatch = useDispatch();
    const { digitalChannels } = useSelector(getChartDigitalChannelInfo);

    const toggle = (i: number) => {
        const channels: booleanTupleOf8 = [...digitalChannels];
        channels[i] = !channels[i];
        dispatch(setDigitalChannels({ digitalChannels: channels }));
    };

    return (
        <div className="tw-flex tw-flex-row tw-gap-0.5">
            {digitalChannels.map((channel, i) => (
                <button
                    type="button"
                    key={`d${i + 1}`}
                    className={classNames(
                        'tw-h-6 tw-grow tw-border tw-border-solid tw-border-gray-700 tw-leading-none',
                        channel
                            ? 'tw-bg-white tw-text-gray-700'
                            : 'tw-bg-gray-700 tw-text-white'
                    )}
                    value={i}
                    onClick={() => toggle(i)}
                >
                    {i}
                </button>
            ))}
        </div>
    );
};
