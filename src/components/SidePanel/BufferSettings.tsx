/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import FormLabel from 'react-bootstrap/FormLabel';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentWindow } from '@electron/remote';
import { kMaxLength as maxBufferSizeForSystem } from 'buffer';
import { unit } from 'mathjs';
import {
    Button,
    Group,
    NumberInlineInput,
    usageData,
} from 'pc-nrfconnect-shared';

import {
    changeMaxBufferSizeAction,
    maxBufferSize as maxBufferSizeSelector,
} from '../../slices/dataLoggerSlice';
import EventAction from '../../usageDataActions';

export const BufferSettings = () => {
    const maxBufferSize = useSelector(maxBufferSizeSelector);
    const dispatch = useDispatch();
    const range = {
        min: 1,
        max: unit(maxBufferSizeForSystem, 'bytes').toNumber('MB'),
    };

    const [bufferSize, setBufferSize] = useState(maxBufferSize);

    return (
        <Group
            heading="Sampling Buffer Size"
            title="Adjust max buffer size for sampling"
        >
            <FormLabel
                htmlFor="slider-ram-size"
                title="Change this value to update the amount of allocated memory. Increasing it will allow sampling for longer. Restart app after updating value for changes to take effect"
            >
                <span className="flex-fill">Max size of buffer</span>
                <NumberInlineInput
                    value={bufferSize}
                    range={range}
                    onChange={value => {
                        setBufferSize(value);
                    }}
                />
                <span>&nbsp;MB</span>
            </FormLabel>
            {bufferSize !== maxBufferSize ? (
                <Button
                    className="w-100"
                    variant="secondary"
                    onClick={() => {
                        usageData.sendUsageData(
                            EventAction.BUFFER_SIZE_CHANGED,
                            `${bufferSize}`
                        );
                        dispatch(
                            changeMaxBufferSizeAction({
                                maxBufferSize: bufferSize,
                            })
                        );
                        getCurrentWindow().reload();
                    }}
                >
                    Restart app and apply settings
                </Button>
            ) : null}
        </Group>
    );
};
