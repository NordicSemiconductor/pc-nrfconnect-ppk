/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
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

// This utility cannot be used within other hooks (e.g. useEffect and useCallback), nor within loops,
// conditiions or nested functions. If you want to check  the current pane inside useEffect you should
// create a variable first and check that:
//
// const isScope = getScopePane();
// useEffect(() => {
//   if (isScope) ...
// }, [isScope])

import { useSelector } from 'react-redux';
import { currentPane as currentPaneSelector } from '../reducers/appReducer';

export const REAL_TIME = 1;
export const DATA_LOGGER = 0;

export const isRealTimePane = (currentPane = null) =>
    getCurrentPane(REAL_TIME, currentPane);

export const isDataLoggerPane = (currentPane = null) =>
    getCurrentPane(DATA_LOGGER, currentPane);

const getCurrentPane = (pane, currentPane = null) => {
    if (currentPane !== null) {
        return currentPane === pane;
    }
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useSelector(currentPaneSelector) === pane;
    } catch (err) {
        const errorMessage = `The current pane (number) should be passed in as argument when used outside a React component.\n${err}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
};
