/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { kMaxLength as maxBufferSizeForSystem } from 'buffer';
import { unit } from 'mathjs';
import {
    CollapsibleGroup,
    NumberInlineInput,
    usageData,
} from 'pc-nrfconnect-shared';

import {
    changeMaxBufferSizeAction,
    maxBufferSize as maxBufferSizeSelector,
} from '../../reducers/dataLoggerReducer';
import EventAction from '../../usageDataActions';

const { getCurrentWindow } = require('electron').remote;

export const BufferSettings = () => {
    const maxBufferSize = useSelector(maxBufferSizeSelector);
    const dispatch = useDispatch();
    const range = {
        min: 1,
        max: unit(maxBufferSizeForSystem, 'bytes').toNumber('MB'),
    };
    const [changed, setChanged] = React.useState(false);
    console.log(range.max);
    return (
        <CollapsibleGroup
            heading="Sampling Buffer Size"
            title="Adjust max buffer size for sampling"
            defaultCollapsed={false}
        >
            <Form.Label
                htmlFor="slider-ram-size"
                title="Change this value to update the amount of allocated memory. Increasing it will allow sampling for longer. Restart app after updating value for changes to take effect"
            >
                <span className="flex-fill">Max size of buffer</span>
                <NumberInlineInput
                    value={maxBufferSize}
                    range={range}
                    onChange={newValue => {
                        dispatch(changeMaxBufferSizeAction(newValue));
                        usageData.sendUsageData(
                            EventAction.BUFFER_SIZE_CHANGED,
                            newValue
                        );
                        setChanged(true);
                    }}
                />
                <span>&nbsp;MB</span>
            </Form.Label>
            {changed && (
                <Button
                    className="w-100 secondary-btn restart-app-btn btn btn-set"
                    variant="secondary"
                    onClick={() => getCurrentWindow().reload()}
                >
                    Restart app and apply settings
                </Button>
            )}
        </CollapsibleGroup>
    );
};
