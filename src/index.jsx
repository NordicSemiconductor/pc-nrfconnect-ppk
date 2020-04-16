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
import {
    logger, getAppDir, startWatchingDevices, stopWatchingDevices,
} from 'nrfconnect/core';
import path from 'path';
import reducers from './reducers';
import MainView from './components/MainView';
import SidePanel from './components/SidePanel';
import ShoppingCartButton from './components/ShoppingCartButton';
import { open, close } from './actions/deviceActions';
import './index.scss';

let globalDispatch;

export default {
    onInit: dispatch => {
        globalDispatch = dispatch;
    },
    decorateLogo: Logo => (
        props => (
            <div className="logo-wrap">
                <ShoppingCartButton
                    url="http://www.nordicsemi.com/eng/Buy-Online?search_token=nRF6707"
                    tooltip="Open web page for buying Power Profiler Kit hardware"
                />
                <Logo {...props} />
            </div>
        )
    ),
    decorateMainView: () => () => <MainView />,
    decorateSidePanel: () => () => <SidePanel />,
    mapLogViewerState: (state, props) => ({
        ...props,
        cssClass: `core-log-viewer${state.app.app.fullView ? ' hidden' : ''}`,
    }),
    decorateNavMenu: NavMenu => (
        props => (
            <div className="nav-menu-wrap">
                <NavMenu {...props} />
                Power Profiler
            </div>
        )
    ),
    mapDeviceSelectorState: (state, props) => ({
        portIndicatorStatus: (state.app.app.portName !== null) ? 'on' : 'off',
        ...props,
    }),
    reduceApp: reducers,
    middleware: store => next => action => { // eslint-disable-line
        if (!action) {
            return;
        }
        const { dispatch } = store;

        switch (action.type) {
            case 'DEVICE_SELECTED':
                logger.info(`Validating firmware for device with s/n ${action.device.serialNumber}`);
                break;

            case 'DEVICE_DESELECTED':
                logger.info('Deselecting device');
                dispatch(close()).then(() => {
                    dispatch(startWatchingDevices());
                });
                break;

            case 'DEVICE_SETUP_COMPLETE': {
                dispatch(stopWatchingDevices());
                const { device } = action;
                logger.info(`Opening device with s/n ${device.serialNumber}`);
                dispatch(open(device));
                break;
            }
            default:
        }
        next(action);
    },
    config: {
        selectorTraits: {
            jlink: true,
            serialport: true,
        },
        deviceSetup: {
            jprog: {
                nrf52: {
                    fw: path.resolve(getAppDir(), 'firmware/ppk_nrfconnect.hex'),
                    fwVersion: 'ppk-fw-2.0.1',
                    fwIdAddress: 0x10000,
                },
            },
            needSerialport: false,
        },
        releaseCurrentDevice: () => globalDispatch(close()),
    },
};
