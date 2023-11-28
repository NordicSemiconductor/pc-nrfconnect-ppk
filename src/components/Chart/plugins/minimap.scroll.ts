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
    foldingBuffer: FoldingBuffer;
    updateMinimapData: (chart: MinimapChart) => void;
    onNewData: (value: number, timestamp: number) => void;
    clearMinimap: (chart: MinimapChart) => void;
}

let lastXPosition = 0;
let leftClickPressed = false;
let chartRef: MinimapChart;

const getClickMetaData = (chart: MinimapChart, offsetX: number) => {
    if (chart.windowNavigateCallback == null) return;
    if (chart.data.datasets[0].data.length === 0) return;

    const windowDuration = chart.options.ampereChart?.windowDuration;
    const windowEnd = chart.options.ampereChart?.windowEnd;

    if (windowDuration == null || windowEnd == null) {
        return;
    }

    const {
        scales: { x: xScale },
    } = chart;

    const xPosition = xScale.getValueForPixel(offsetX);
    if (xPosition == null) return;

    const windowBegin = windowEnd - windowDuration;
    const clickedOnSlider = xPosition >= windowBegin && xPosition <= windowEnd;
    const delta = xPosition - lastXPosition;
    const currentSliderCenter = windowEnd - windowDuration / 2;

    let centerPosition = xPosition;
    if (clickedOnSlider) {
        centerPosition = currentSliderCenter + delta;
    }

    lastXPosition += delta;

    return {
        clickedOnSlider,
        centerPosition,
    };
};

const pointerEnter = (event: PointerEvent) => {
    getClickMetaData(chartRef, event.offsetX);
};

const pointerDown = (event: PointerEvent) => {
    // if left clicking
    // eslint-disable-next-line no-bitwise
    if ((event.buttons & 0x01) === 0x01) {
        leftClickPressed = true;
        const metaData = getClickMetaData(chartRef, event.offsetX);
        if (metaData) {
            if (!metaData?.clickedOnSlider) {
                chartRef.windowNavigateCallback?.(metaData.centerPosition);
            }
        }
    }
};

const pointerUp = (event: PointerEvent) => {
    // if left clicking
    // eslint-disable-next-line no-bitwise
    if ((event.buttons & 0x01) === 0x01) {
        leftClickPressed = false;
    }
};

const pointerMove = (event: PointerEvent) => {
    // if left clicking
    // eslint-disable-next-line no-bitwise
    if ((event.buttons & 0x01) === 0x01 && leftClickPressed) {
        const metaData = getClickMetaData(chartRef, event.offsetX);
        if (metaData) {
            chartRef.windowNavigateCallback?.(metaData.centerPosition);
        }
    } else {
        leftClickPressed = false;
    }
};

const plugin: MinimapScroll = {
    id: 'minimapScroll',
    foldingBuffer: new FoldingBuffer(),

    beforeInit(chart: MinimapChart) {
        chartRef = chart;
        const { canvas } = chart.ctx;

        chart.onSliderRangeChange = (end, duration, liveMode) => {
            chart.updateSlider?.(chart, end, duration, liveMode);
            chart.redrawSlider = () => {
                chart.updateSlider?.(chart, end, duration, liveMode);
            };
        };

        canvas.addEventListener('pointermove', pointerMove);

        canvas.addEventListener('pointerdown', pointerDown);

        canvas.addEventListener('pointerup', pointerUp);

        canvas.addEventListener('pointerenter', pointerEnter);

        // In case data already exist
        this.updateMinimapData(chart);
    },
    onNewData(value, timestamp) {
        this.foldingBuffer.addData(value, timestamp);
    },

    beforeDestroy(chart: MinimapChart) {
        const { canvas } = chart.ctx;
        canvas.removeEventListener('pointermove', pointerMove);

        canvas.removeEventListener('pointerdown', pointerDown);

        canvas.removeEventListener('pointerup', pointerUp);

        canvas.removeEventListener('pointerenter', pointerEnter);
    },

    updateMinimapData(chart) {
        if (!leftClickPressed) {
            /* @ts-expect-error Have not figured out how to handle this */
            chart.data.datasets[0].data = this.foldingBuffer.getData();
            if (chart.options.scales?.x != null) {
                chart.options.scales.x.max = DataManager().getTimestamp();
            }
            chart.update();
            chart.redrawSlider?.();
        }
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
