/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Plugin } from 'chart.js';

import type { MinimapChart } from '../../../features/minimap/Minimap';
import {
    eventEmitter,
    getTotalDurationInMicroSeconds,
    indexToTimestamp,
    options,
} from '../../../globals';

interface MinimapScroll extends Plugin<'line'> {
    leftClickPressed: boolean;
    updateMinimapData: (chart: MinimapChart) => void;
    dataBufferStep: number;
    dataBufferIndex: number;
    dataBuffer: { x: number; y: number }[];
}

function pane(event: PointerEvent, chart: MinimapChart) {
    if (chart.windowNavigateCallback == null) return;

    const {
        scales: { x: xScale },
    } = chart;

    const xPosition = xScale.getValueForPixel(event.offsetX);
    if (xPosition == null) return;
    if (chart.options.ampereChart?.windowDuration == null) {
        return;
    }

    const halfWindow = chart.options.ampereChart.windowDuration / 2;

    if (xPosition - halfWindow < 0) {
        chart.windowNavigateCallback(halfWindow);
        return;
    }

    const edgeOfMinimap = indexToTimestamp(options.index);
    if (xPosition + halfWindow > edgeOfMinimap) {
        chart.windowNavigateCallback(edgeOfMinimap - halfWindow);
        return;
    }

    chart.windowNavigateCallback(xPosition);
}

const plugin: MinimapScroll = {
    id: 'minimapScroll',
    leftClickPressed: false,
    dataBufferStep: 1000,
    dataBufferIndex: 0,
    dataBuffer: [],

    beforeInit(chart: MinimapChart) {
        const { canvas } = chart.ctx;

        canvas.addEventListener('pointermove', event => {
            if (this.leftClickPressed === true) {
                pane(event, chart);
            }
        });

        canvas.addEventListener('pointerdown', event => {
            if (event.button === 0) {
                this.leftClickPressed = true;
                pane(event, chart);
            }
        });

        canvas.addEventListener('pointerup', event => {
            if (event.button === 0) {
                this.leftClickPressed = false;
            }
        });
        canvas.addEventListener('pointerleave', () => {
            this.leftClickPressed = false;
        });
        eventEmitter.on('updateMinimap', () => this.updateMinimapData(chart));
    },
    updateMinimapData(chart) {
        do {
            this.dataBuffer.push({
                x: indexToTimestamp(this.dataBufferIndex),
                y: options.data[this.dataBufferIndex],
            });

            this.dataBufferIndex += this.dataBufferStep;
        } while (this.dataBufferIndex + this.dataBufferStep < options.index);

        console.log(this.dataBufferIndex);
        console.log(options.data);
        console.log(
            options.index,
            indexToTimestamp(options.index),
            options.timestamp
        );
        console.log(this.dataBuffer);

        chart.data.datasets[0].data = this.dataBuffer;
        if (chart.options.scales?.x != null) {
            chart.options.scales.x.max = options.timestamp;
        }
        chart.update();
    },
};

export default plugin;
