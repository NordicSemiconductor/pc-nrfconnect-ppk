/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    addConfirmBeforeClose,
    Button,
    clearConfirmBeforeClose,
    Group,
    selectedDevice,
    SidePanel,
    Spinner,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { updateAllGains, updateSpikeFilter } from '../../actions/deviceActions';
import DeprecatedDeviceDialog from '../../features/DeprecatedDevice/DeprecatedDevice';
import ProgressDialog from '../../features/ProgressDialog/ProgressDialog';
import { getShowProgressDialog } from '../../features/ProgressDialog/progressSlice';
import {
    deviceOpen as deviceOpenSelector,
    isFileLoaded,
    isSavePending,
} from '../../slices/appSlice';
import { isSessionActive } from '../../slices/chartSlice';
import { resetGainsToDefaults } from '../../slices/gainsSlice';
import { resetSpikeFilterToDefaults } from '../../slices/spikeFilterSlice';
import { resetVoltageRegulatorMaxCapPPK2 } from '../../slices/voltageRegulatorSlice';
import { isDataLoggerPane, isScopePane } from '../../utils/panes';
import { CapVoltageSettings } from './CapVoltageSettings';
import DisplayOptions from './DisplayOptions';
import Gains from './Gains';
import Instructions from './Instructions';
import { Load, Save } from './LoadSave';
import PowerMode from './PowerMode';
import SessionSettings from './SessionSettings';
import SpikeFilter from './SpikeFilter';
import StartStop from './StartStop';

const useConfirmBeforeClose = () => {
    const pendingSave = useSelector(isSavePending);
    const dispatch = useDispatch();

    useEffect(() => {
        if (pendingSave) {
            dispatch(
                addConfirmBeforeClose({
                    id: 'unsavedData',
                    message:
                        'You have unsaved data. if you close the application this data will be lost. Are you sure you want to close?',
                })
            );
        } else {
            dispatch(clearConfirmBeforeClose('unsavedData'));
        }
    }, [dispatch, pendingSave]);
};

export default () => {
    const dispatch = useDispatch();
    const deviceConnected = useSelector(selectedDevice);
    const deviceOpen = useSelector(deviceOpenSelector);
    const fileLoaded = useSelector(isFileLoaded);
    const sessionActive = useSelector(isSessionActive);
    const showProgressDialog = useSelector(getShowProgressDialog);
    const scopePane = useSelector(isScopePane);
    const dataLoggerPane = useSelector(isDataLoggerPane);

    useConfirmBeforeClose();

    const connecting = deviceConnected && !deviceOpen;

    if (connecting) {
        return (
            <SidePanel className="side-panel tw-mt-9">
                <div className="tw-text-center tw-text-base">
                    <span>Connecting...</span> <Spinner size="sm" />
                </div>
            </SidePanel>
        );
    }

    return (
        <SidePanel className="side-panel tw-mt-9">
            {!deviceConnected && <Load />}
            {!fileLoaded && !deviceConnected && !sessionActive && (
                <Instructions />
            )}
            {!fileLoaded && deviceOpen && (scopePane || dataLoggerPane) && (
                <>
                    <PowerMode />
                    <StartStop />
                </>
            )}
            {(fileLoaded || deviceOpen || sessionActive) &&
                (scopePane || dataLoggerPane) && (
                    <>
                        <Save />
                        <DisplayOptions />
                    </>
                )}
            {(dataLoggerPane || !deviceConnected) && <SessionSettings />}
            {!fileLoaded && deviceOpen && (dataLoggerPane || scopePane) && (
                <Group collapsible heading="Advanced Configuration" gap={8}>
                    <div className="tw-border tw-border-solid tw-border-gray-400 tw-p-2 tw-text-[10px] tw-text-gray-400">
                        WARNING Only change values if you know what you are
                        doing
                    </div>
                    <Gains />
                    <SpikeFilter />
                    <CapVoltageSettings />
                    <Button
                        onClick={() => {
                            dispatch(resetSpikeFilterToDefaults());
                            dispatch(updateSpikeFilter()); // send to device

                            dispatch(resetGainsToDefaults());
                            dispatch(updateAllGains()); // send to device

                            dispatch(resetVoltageRegulatorMaxCapPPK2());
                        }}
                        variant="secondary"
                    >
                        Reset to default Configuration
                    </Button>
                </Group>
            )}
            <DeprecatedDeviceDialog />
            {showProgressDialog && <ProgressDialog />}
        </SidePanel>
    );
};
