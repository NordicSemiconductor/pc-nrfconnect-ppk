import React from 'react';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup, NumberInlineInput } from 'pc-nrfconnect-shared';

import {
    changeMaxBufferSizeAction,
    maxBufferSize as maxBufferSizeSelector,
} from '../../reducers/dataLoggerReducer';

export const BufferSettings = () => {
    const maxBufferSize = useSelector(maxBufferSizeSelector);
    const dispatch = useDispatch();
    const range = { min: 173, max: Infinity };

    return (
        <>
            <CollapsibleGroup
                heading="Buffer Settings"
                title="Increase size of buffer to increase the memory usage for sampling."
            >
                <Form.Label
                    htmlFor="slider-ram-size"
                    title="Increase max size of buffer to sample for longer."
                >
                    <span className="flex-fill">Max size of buffer</span>
                    <NumberInlineInput
                        value={maxBufferSize}
                        range={range}
                        onChange={newValue =>
                            dispatch(changeMaxBufferSizeAction(newValue))
                        }
                    />
                    <span> MB</span>
                </Form.Label>
            </CollapsibleGroup>
        </>
    );
};
