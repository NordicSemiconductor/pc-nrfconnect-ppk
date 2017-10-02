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
import { defaults, Line } from 'react-chartjs-2';

defaults.global.tooltips.enabled = false;
defaults.global.legend.display = false;
defaults.global.animation.duration = 0;

class Chart extends React.Component {
    constructor(props) {
        super(props);
        this.len = 0;
        this.lineData = new props.options.DataType(this.len);
    }

    componentDidMount() {
        this.onChartSizeUpdate({ width: this.chartRef.chart_instance.width });
    }

    onChartSizeUpdate(size) {
        if (this.len === size.width) {
            return;
        }
        const { options } = this.props;
        this.len = size.width;
        this.lineData = new options.DataType(this.len);
        this.forceUpdate();
    }

    render() {
        const { options } = this.props;
        let indexStart = options.index - this.len;
        if (indexStart < 0) {
            indexStart += options.data.length;
        }
        const lineDataA = options.data.slice(indexStart, options.index);
        const lineDataB = options.data.slice(0, this.len - lineDataA.length);
        this.lineData.set(lineDataA);
        this.lineData.set(lineDataB, lineDataA.length);

        const chartData = {
            datasets: [{
                borderColor: options.color,
                borderWidth: 1,
                fill: false,
                data: Array.from(this.lineData),
                pointRadius: 0,
            }],
            labels: [...Array(this.len).keys()].map(k => {
                const t = (this.len - k - 1) * 1000;
                const ts = new Date(options.timestamp.getTime() - (t / options.samplesPerSecond));
                return `${`${ts.getSeconds()}`.padStart(2, '0')}.${`${ts.getMilliseconds()}`.padStart(3, '0')}`;
            }),
        };

        const { min, max } = options;
        const chartOptions = {
            scales: {
                xAxes: [{
                    type: 'category',
                    ticks: {
                        maxRotation: 0,
                        autoSkipPadding: 25,
                    },
                }],
                yAxes: [{
                    type: 'linear', min, max, ticks: { min, max },
                }],
            },
            redraw: true,
            maintainAspectRatio: false,
            onResize: (instance, size) => {
                this.onChartSizeUpdate(size);
            },
        };

        return <Line ref={r => { this.chartRef = r; }} data={chartData} options={chartOptions} />;
    }
}

Chart.propTypes = {
    options: PropTypes.shape({
        DataType: PropTypes.func,
        // data: PropsTypes.instanceOf(...),
        // index: PropTypes.number,
        // timestamp: PropTypes.instanceOf(Date),
        // samplesPerSecond: PropTypes.number,
        // color: PropTypes.string,
        // min: PropTypes.number,
        // max: PropTypes.number,
    }).isRequired,
};

export default Chart;
