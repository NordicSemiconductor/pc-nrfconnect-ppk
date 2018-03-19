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
import { logger } from 'nrfconnect/core';
import reducers from './lib/reducers';
import MainView from './lib/containers/MainView';
import SidePanel from './lib/containers/SidePanel';
import ShoppingCartButton from './lib/components/ShoppingCartButton';
import * as PPKActions from './lib/actions/PPKActions';
import * as FirmwareActions from './lib/actions/firmwareActions';
import './resources/css/index.less';

export default {
    onReady: () => {
        logger.info('App initialized');
    },
    decorateLogo: Logo => (
        props => (
            <div className="logo-wrap">
                <ShoppingCartButton
                    url={'http://www.nordicsemi.com/eng/Buy-Online?search_token=nRF6707'}
                    tooltip={'Open web page for buying Power Profiler Kit hardware'}
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
    mapSerialPortSelectorState: (state, props) => ({
        portIndicatorStatus: (state.app.app.portName !== null) ? 'on' : 'off',
        ...props,
    }),
    reduceApp: reducers,
    middleware: store => next => action => { // eslint-disable-line
        if (!action) {
            return;
        }
        if (action.type === 'SERIAL_PORT_SELECTED') {
            const { port } = action;
            store.dispatch(FirmwareActions.validateFirmware(port.serialNumber, {
                onValid: () => store.dispatch(PPKActions.open(port)),
                onInvalid: () => store.dispatch({ type: 'FIRMWARE_DIALOG_SHOW', port }),
            }));
        }
        if (action.type === 'SERIAL_PORT_DESELECTED') {
            store.dispatch(PPKActions.close());
        }
        if (action.type === 'FIRMWARE_DIALOG_UPDATE_REQUESTED') {
            const { port } = action;
            store.dispatch(FirmwareActions.programFirmware(port.serialNumber, {
                onSuccess: () => {
                    store.dispatch(PPKActions.open(port));
                    store.dispatch({ type: 'FIRMWARE_DIALOG_HIDE' });
                },
            }));
        }
        next(action);
    },
};
