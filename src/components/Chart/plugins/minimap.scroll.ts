/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Plugin } from 'chart.js';

import type { MinimapChart } from '../../../features/minimap/Minimap';
import { DataManager } from '../../../globals';
import { FoldingBuffer } from './foldingBuffer';

interface MinimapScroll extends Plugin<'line'> {
    leftClickPressed: boolean;
    foldingBuffer: FoldingBuffer;
    updateMinimapData: (chart: MinimapChart) => void;
    onNewData: (value: number, timestamp: number) => void;
    clearMinimap: (chart: MinimapChart) => void;
}

function pan(event: PointerEvent, chart: MinimapChart) {
    if (chart.windowNavigateCallback == null) return;
    if (chart.data.datasets[0].data.length === 0) return;

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

    const edgeOfMinimap = DataManager().getTimestamp();
    if (xPosition + halfWindow > edgeOfMinimap) {
        chart.windowNavigateCallback(edgeOfMinimap - halfWindow);
        return;
    }

    chart.windowNavigateCallback(xPosition);
}

const plugin: MinimapScroll = {
    id: 'minimapScroll',
    leftClickPressed: false,
    foldingBuffer: new FoldingBuffer(),

    beforeInit(chart: MinimapChart) {
        const { canvas } = chart.ctx;

        canvas.addEventListener('pointermove', event => {
            if (this.leftClickPressed === true) {
                pan(event, chart);
            }
        });

        canvas.addEventListener('pointerdown', event => {
            if (event.button === 0) {
                this.leftClickPressed = true;
                pan(event, chart);
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

        // In case data already exist
        this.updateMinimapData(chart);
    },

    onNewData(value, timestamp) {
        this.foldingBuffer.addData(value, timestamp);
    },

    beforeDestroy(chart: MinimapChart) {
        const { canvas } = chart.ctx;
        canvas.removeEventListener('pointermove', event => {
            if (this.leftClickPressed === true) {
                pan(event, chart);
            }
        });

        canvas.removeEventListener('pointerdown', event => {
            if (event.button === 0) {
                this.leftClickPressed = true;
                pan(event, chart);
            }
        });

        canvas.removeEventListener('pointerup', event => {
            if (event.button === 0) {
                this.leftClickPressed = false;
            }
        });
        canvas.removeEventListener('pointerleave', () => {
            this.leftClickPressed = false;
        });
    },

    updateMinimapData(chart) {
        /* @ts-expect-error Have not figured out how to handle this */
        chart.data.datasets[0].data = this.foldingBuffer.getData();
        if (chart.options.scales?.x != null) {
            chart.options.scales.x.max = DataManager().getTimestamp();
        }
        chart.update();
    },

    clearMinimap(chart) {
        this.foldingBuffer = new FoldingBuffer();
        chart.data.datasets[0].data = [];
        if (chart.options.scales?.x != null) {
            chart.options.scales.x.max = DataManager().getTimestamp();
        }
        chart.update();
    },
};

export default plugin;
