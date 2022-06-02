/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { useDispatch, useSelector } from 'react-redux';
import { CollapsibleGroup, Slider, Toggle } from 'pc-nrfconnect-shared';

import {
    spikeFilteringToggle,
    switchingPointsDownSet,
    switchingPointsReset,
    switchingPointsUpSet,
} from '../../actions/deviceActions';
import { appState } from '../../reducers/appReducer';
import {
    switchingPointDownMovedAction,
    switchingPointsState,
    switchingPointUpMoved,
} from '../../reducers/switchingPointsReducer';

const SwitchPoints = () => {
    const dispatch = useDispatch();

    const {
        spikeFiltering,
        switchUpHigh,
        switchUpLow,
        switchDownHigh,
        switchDownLow,
        switchUpSliderPosition,
        switchDownSliderPosition,
    } = useSelector(switchingPointsState);
    const { capabilities } = useSelector(appState);

    if (!capabilities.ppkSwitchPointUp) {
        return null;
    }

    return (
        <CollapsibleGroup heading="Switch levels">
            {capabilities.ppkSwitchPointUp && (
                <>
                    <span title="Set dynamic range switching levels. See user guide for details.">
                        Switch up
                    </span>
                    <Slider
                        title="Set dynamic range switching levels. See user guide for details."
                        values={[switchUpSliderPosition]}
                        range={{ min: 38, max: 175 }}
                        onChange={[val => dispatch(switchingPointUpMoved(val))]}
                        onChangeComplete={() =>
                            dispatch(switchingPointsUpSet())
                        }
                    />
                    <Row className="mb-3">
                        <Col>{`${switchUpLow.toFixed(2)} \u00B5A`}</Col>
                        <Col className="text-right">{`${switchUpHigh.toFixed(
                            2
                        )} mA`}</Col>
                    </Row>
                    Switch down
                    <Slider
                        values={[switchDownSliderPosition]}
                        range={{ min: 100, max: 400 }}
                        onChange={[
                            val => dispatch(switchingPointDownMovedAction(val)),
                        ]}
                        onChangeComplete={() =>
                            dispatch(switchingPointsDownSet())
                        }
                    />
                    <Row className="mb-2">
                        <Col>{`${switchDownLow.toFixed(2)} \u00B5A`}</Col>
                        <Col className="text-right">{`${switchDownHigh.toFixed(
                            2
                        )} mA`}</Col>
                    </Row>
                    <Button
                        onClick={() => dispatch(switchingPointsReset())}
                        variant="set"
                        className="w-50 mb-2"
                    >
                        Reset
                    </Button>
                </>
            )}
            {capabilities.ppkSpikeFilteringOn && (
                <Toggle
                    title="Removes excessive current spikes caused by measurement circuitry"
                    onToggle={() => dispatch(spikeFilteringToggle())}
                    isToggled={spikeFiltering}
                    label="Spike filtering"
                    variant="primary"
                />
            )}
        </CollapsibleGroup>
    );
};

export default SwitchPoints;
