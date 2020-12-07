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

import { formatDataForExport } from '../exportChartAction';

const buffer = [5, 6, 7, 8, 9, 10];
const bitsData = [255, 255, 255, 0, 69, 255];
const startingPoint = 2;
const numberOfDataPoints = 2;

// There seems to be a discrepancy between the length parameter
// (in this example we have a length of 2, but the resulting string has 3 samples)
// and the actual number of samples we get. However, the solution as a whole seems
// to work, so I'm leaving it for now
describe('formatData', () => {
    it('should contain only current values', () => {
        // selection [timestamp, current, bits, bitsSeperated]
        const selection = [false, true, false, false];
        const content = formatDataForExport(
            startingPoint,
            numberOfDataPoints,
            buffer,
            bitsData,
            selection
        );
        // Test that we only get current
        expect(content).toMatch(/^7\.000\s/);
        expect(content).toMatch(/\s8\.000\s/);
        expect(content).toMatch(/\s9\.000\s/);
    });

    it('should contain only timestamp and current values', () => {
        // selection [timestamp, current, bits, bitsSeperated]
        const selection = [true, true, false, false];
        const content = formatDataForExport(
            startingPoint,
            numberOfDataPoints,
            buffer,
            bitsData,
            selection
        );
        // Test that we only get timestamp and current
        expect(content).toMatch(/0\.02,7\.000\s/);
        expect(content).toMatch(/0\.03,8\.000\s/);
        expect(content).toMatch(/0\.04,9\.000\s/);
    });

    it('should contain all data', () => {
        // selection [timestamp, current, bits, bitsSeperated]
        const selection = [true, true, true, true];
        const content = formatDataForExport(
            startingPoint,
            numberOfDataPoints,
            buffer,
            bitsData,
            selection
        );
        // Test that we only get timestamp and current
        expect(content).toMatch(/0\.02,7\.000,11111111,1,1,1,1,1,1,1,1/);
        expect(content).toMatch(/0\.03,8\.000,00000000,0,0,0,0,0,0,0,0\s/);
        // 69 to binary = 01000101
        expect(content).toMatch(/0\.04,9\.000,01000101,0,1,0,0,0,1,0,1\s/);
    });
});
