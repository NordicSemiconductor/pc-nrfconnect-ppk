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

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { defaults, Line } from 'react-chartjs-2';

import { triggerData, averageData } from '../actions/PPKActions';

defaults.global.tooltips.enabled = false;
defaults.global.legend.display = false;
defaults.global.animation.duration = 0;

const len = 600;
const triggerLine = new Uint16Array(len);
const averageLine = new Float32Array(len);

const Chart = props => {
    const { triggerIndex, averageIndex } = props;

    let triggerIndexStart = triggerIndex - len;
    if (triggerIndexStart < 0) {
        triggerIndexStart += triggerData.length;
    }
    let averageIndexStart = averageIndex - len;
    if (averageIndexStart < 0) {
        averageIndexStart += averageData.length;
    }
    const triggerLineA = triggerData.slice(triggerIndexStart, triggerIndex);
    const triggerLineB = triggerData.slice(0, len - triggerLineA.length);
    triggerLine.set(triggerLineA);
    triggerLine.set(triggerLineB, triggerLineA.length);
    const averageLineA = averageData.slice(averageIndexStart, averageIndex);
    const averageLineB = averageData.slice(0, len - averageLineA.length);
    averageLine.set(averageLineA);
    averageLine.set(averageLineB, averageLineA.length);

    const now = new Date();

    const chartData = {
        datasets: [{
            label: 'trigger',
            borderColor: 'rgba(79, 140, 196, 1)',
            borderWidth: 1,
            fill: false,
            data: Array.from(triggerLine).map((y, i) => ({ x: new Date(now - i), y })),
            pointRadius: 0,
        }, {
            label: 'average',
            borderColor: 'rgba(179, 40, 96, 0.3)',
            borderWidth: 1,
            fill: false,
            data: Array.from(averageLine).map((y, i) => ({ x: new Date(now - i), y })),
            pointRadius: 0,
        }],
    };

    const chartOptions = {
        scales: {
            xAxes: [{
                id: 'x-time',
                type: 'time',
            }],
            yAxes: [{
                type: 'linear',
            }],
        },
        redraw: true,
    };

    return <Line data={chartData} options={chartOptions} />;
};

Chart.propTypes = {
    triggerIndex: PropTypes.number,
    averageIndex: PropTypes.number,
};

Chart.defaultProps = {
    triggerIndex: 0,
    averageIndex: 0,
};

export default connect(
    state => ({
        triggerIndex: state.app.chart.triggerIndex,
        averageIndex: state.app.chart.averageIndex,
    }),
)(Chart);
