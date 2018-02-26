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

export const ADC_SAMPLING_TIME_US = 13;
export const SAMPLES_PER_AVERAGE = 10;
export const AVERAGE_TIME_US = SAMPLES_PER_AVERAGE * ADC_SAMPLING_TIME_US;
export const TRIGGER_SAMPLES_PER_SECOND = 1e6 / ADC_SAMPLING_TIME_US;
export const AVERAGE_SAMPLES_PER_SECOND = 1e6 / AVERAGE_TIME_US;
export const BUFFER_LENGTH_IN_SECONDS = 120;
export const DEFAULT_TRIGGER_LENGTH = 450;
export const AVERAGE_BUFFER_LENGTH = AVERAGE_SAMPLES_PER_SECOND * BUFFER_LENGTH_IN_SECONDS;

export const MAX_RTT_READ_LENGTH = 1000;    // anything up to SEGGER buffer size
export const WAIT_FOR_START = 6000;         // milliseconds
export const WAIT_FOR_HW_STATES = 5000;     // milliseconds

export const STX = 0x02;
export const ETX = 0x03;
export const ESC = 0x1F;

const ADC_REF = 0.6;
const ADC_GAIN = 4.0;
const ADC_MAX = 8192.0;
export const ADC_MULT = (ADC_REF / (ADC_GAIN * ADC_MAX));

export const MEAS_RANGE_NONE = 0;
export const MEAS_RANGE_LO = 1;
export const MEAS_RANGE_MID = 2;
export const MEAS_RANGE_HI = 3;
export const MEAS_RANGE_INVALID = 4;

export const MEAS_RANGE_POS = 14;

// eslint-disable-next-line no-bitwise
export const MEAS_RANGE_MSK = (3 << 14);

export const MEAS_ADC_MSK = 0x3FFF;

export const MEAS_RES_HI = 1.8;
export const MEAS_RES_MID = 28;
export const MEAS_RES_LO = 500;

export const PPKCmd = {
    TriggerSet: 0x01,
    AvgNumSet: 0x02,            // (no-firmware)
    TriggerWindowSet: 0x03,
    TriggerIntervalSet: 0x04,   // (no-firmware)
    TriggerSingleSet: 0x05,
    AverageStart: 0x06,
    AverageStop: 0x07,
    RangeSet: 0x08,             // (no-firmware)
    LCDSet: 0x09,               // (no-firmware)
    TriggerStop: 0x0A,
    DutToggle: 0x0C,
    RegulatorSet: 0x0D,
    SwitchPointDown: 0x0E,
    SwitchPointUp: 0x0F,
    TriggerExtToggle: 0x11,
    ResUserSet: 0x12,
    SpikeFilteringOn: 0x15,
    SpikeFilteringOff: 0x16,
};
