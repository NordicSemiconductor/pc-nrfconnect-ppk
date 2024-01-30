/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    CollapsibleGroup,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import os from 'os';

import {
    getSessionRootFolder,
    setSessionRootFolder,
} from '../../slices/appSlice';
import { selectDirectoryDialog } from '../../utils/fileUtils';
import { setPreferredSessionLocation } from '../../utils/persistentStore';

export default () => {
    const dispatch = useDispatch();
    const sessionRootFolder = useSelector(getSessionRootFolder);

    return (
        <CollapsibleGroup heading="Session Data" defaultCollapsed={false}>
            <div className="tw-flex tw-flex-col tw-justify-between tw-gap-2">
                <div className="tw-flex tw-flex-col tw-justify-between tw-gap-1">
                    <span>Root directory</span>
                    <span
                        title={sessionRootFolder}
                        className="tw-block tw-overflow-hidden tw-text-ellipsis"
                    >
                        {sessionRootFolder}
                    </span>
                </div>
                <div className="tw-flex tw-gap-2">
                    <Button
                        className="tw-w-full"
                        variant="secondary"
                        onClick={() => {
                            selectDirectoryDialog().then(filePath => {
                                dispatch(setSessionRootFolder(filePath));
                                setPreferredSessionLocation(filePath);
                            });
                        }}
                    >
                        Change
                    </Button>
                    <Button
                        className="tw-w-full"
                        variant="secondary"
                        onClick={() => {
                            dispatch(setSessionRootFolder(os.tmpdir()));
                            setPreferredSessionLocation(os.tmpdir());
                        }}
                    >
                        Reset
                    </Button>
                </div>
            </div>
        </CollapsibleGroup>
    );
};
