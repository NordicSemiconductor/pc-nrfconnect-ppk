/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import { useDispatch } from 'react-redux';
import PropTypes from 'prop-types';

import {
    externalTriggerToggled,
    triggerStop,
} from '../../../actions/deviceActions';
import { CONTINUOUS, EXTERNAL, SINGLE } from './triggerConstants';

const TriggerModeGroup = ({
    triggerMode,
    setTriggerMode,
    hasExternal,
    externalTrigger,
    rttRunning,
    triggerRunning,
}) => {
    const dispatch = useDispatch();
    const setSingleTriggerMode = () => {
        if (triggerRunning && triggerMode === CONTINUOUS) {
            dispatch(triggerStop());
        }
        setTriggerMode(SINGLE);
        if (externalTrigger) {
            dispatch(externalTriggerToggled(false));
        }
    };

    const setContinuousTriggerMode = () => {
        setTriggerMode(CONTINUOUS);
        if (externalTrigger) {
            dispatch(externalTriggerToggled(false));
        }
    };

    const setExternalTriggerMode = () => {
        setTriggerMode(EXTERNAL);
        dispatch(externalTriggerToggled(true));
    };
    return (
        <ButtonGroup className="mb-2 w-100 trigger-mode d-flex flex-row">
            <Button
                title="Sample once"
                disabled={!rttRunning || triggerMode === SINGLE}
                variant={triggerMode === SINGLE ? 'set' : 'unset'}
                onClick={setSingleTriggerMode}
            >
                Single
            </Button>
            <Button
                title="Sample until stopped by user"
                disabled={!rttRunning || triggerMode === CONTINUOUS}
                variant={triggerMode === CONTINUOUS ? 'set' : 'unset'}
                onClick={setContinuousTriggerMode}
            >
                Continuous
            </Button>
            {hasExternal && (
                <Button
                    title="Sample controlled from TRIG IN"
                    disabled={!rttRunning || triggerMode === EXTERNAL}
                    variant={triggerMode === EXTERNAL ? 'set' : 'unset'}
                    onClick={setExternalTriggerMode}
                >
                    External
                </Button>
            )}
        </ButtonGroup>
    );
};

export default TriggerModeGroup;

TriggerModeGroup.propTypes = {
    triggerMode: PropTypes.string.isRequired,
    setTriggerMode: PropTypes.func.isRequired,
    hasExternal: PropTypes.bool.isRequired,
    externalTrigger: PropTypes.bool.isRequired,
    rttRunning: PropTypes.bool.isRequired,
    triggerRunning: PropTypes.bool.isRequired,
};
