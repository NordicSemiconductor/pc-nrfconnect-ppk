/* Copyright (c) 2015 - 2017, Nordic Semiconductor ASA
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

export const TOGGLE_FULL_VIEW = 'TOGGLE_FULL_VIEW';
export const TRIGGER_WINDOW_UNIT_CHANGE = 'TRIGGER_WINDOW_UNIT_CHANGE';
export const TRIGGER_WINDOW_LENGTH_MOVE = 'TRIGGER_WINDOW_LENGTH_MOVE';
export const VOLTAGE_REGULATOR_VDD_MOVE = 'VOLTAGE_REGULATOR_VDD_MOVE';
export const USER_RESISTOR_UPDATED = 'USER_RESISTOR_UPDATED';
export const CHART_AVERAGE_CURSOR = 'CHART_AVERAGE_CURSOR';
export const CHART_AVERAGE_WINDOW = 'CHART_AVERAGE_WINDOW';
export const CHART_TRIGGER_CURSOR = 'CHART_TRIGGER_CURSOR';
export const CHART_TRIGGER_WINDOW = 'CHART_TRIGGER_WINDOW';

export function toggleFullView() {
    return {
        type: TOGGLE_FULL_VIEW,
    };
}

export function triggerUnitChanged(triggerUnit) {
    return {
        type: TRIGGER_WINDOW_UNIT_CHANGE,
        triggerUnit,
    };
}

export function moveTriggerWindowLength(windowLength) {
    return {
        type: TRIGGER_WINDOW_LENGTH_MOVE,
        windowLength,
    };
}

export function moveVoltageRegulatorVdd(vdd) {
    return {
        type: VOLTAGE_REGULATOR_VDD_MOVE,
        vdd,
    };
}

export function updateHighResistor(userResHi) {
    return {
        type: USER_RESISTOR_UPDATED,
        userResHi,
    };
}

export function updateMidResistor(userResMid) {
    return {
        type: USER_RESISTOR_UPDATED,
        userResMid,
    };
}

export function updateLowResistor(userResLo) {
    return {
        type: USER_RESISTOR_UPDATED,
        userResLo,
    };
}


export function averageChartCursor(cursorBegin, cursorEnd) {
    return {
        type: CHART_AVERAGE_CURSOR,
        cursorBegin,
        cursorEnd,
    };
}

export function averageChartWindow(windowBegin, windowEnd, windowDuration) {
    return {
        type: CHART_AVERAGE_WINDOW,
        windowBegin,
        windowEnd,
        windowDuration,
    };
}

export function triggerChartCursor(cursorBegin, cursorEnd) {
    return {
        type: CHART_TRIGGER_CURSOR,
        cursorBegin,
        cursorEnd,
    };
}

export function triggerChartWindow(windowBegin, windowEnd, windowDuration) {
    return {
        type: CHART_TRIGGER_WINDOW,
        windowBegin,
        windowEnd,
        windowDuration,
    };
}