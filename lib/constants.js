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

export const ADC_SAMPLING_TIME_US = 20;
export const SAMPLES_PER_AVERAGE = 1;
export const AVERAGE_TIME_US = SAMPLES_PER_AVERAGE * ADC_SAMPLING_TIME_US;
export const AVERAGE_SAMPLES_PER_SECOND = 1e6 / AVERAGE_TIME_US;
export const BUFFER_LENGTH_IN_SECONDS = 60;
export const AVERAGE_BUFFER_LENGTH = AVERAGE_SAMPLES_PER_SECOND * BUFFER_LENGTH_IN_SECONDS;

export const MAX_RTT_READ_LENGTH = 1000; // anything up to SEGGER buffer size
export const WAIT_FOR_START = 6000; // milliseconds
export const WAIT_FOR_HW_STATES = 5000; // milliseconds

export const STX = 0x02;
export const ETX = 0x03;
export const ESC = 0x1F;

// const ADC_REF = 0.6;
// const ADC_GAIN = 0.5;
// const ADC_MAX = 8192.0;
// const AMP_GAIN = 20.0;
// (ADC_REF/ADC_GAIN*ADC_MAX)/ADC_GAIN/R ->
// ((0,6/(0,5*8192)/(20/R))->(1,2*R)/(8192*20)->(1,2/163840)*R
export const ADC_MULT = (1.2 / 163840);

export const MEAS_RES = {
    hi: 1.8,
    mid: 28,
    lo: 500,
};

export const PPKCmd = {
    AvgNumSet: 0x02, // (no-firmware)
    AverageStart: 0x06,
    AverageStop: 0x07,
    RangeSet: 0x08, // (no-firmware)
    LCDSet: 0x09, // (no-firmware)
    DutToggle: 0x0C,
    RegulatorSet: 0x0D,
    SwitchPointDown: 0x0E,
    SwitchPointUp: 0x0F,
    ResUserSet: 0x12,
    SpikeFilteringOn: 0x15,
    SpikeFilteringOff: 0x16,
};
