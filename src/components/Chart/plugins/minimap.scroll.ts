/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Plugin } from 'chart.js';

import type { MinimapChart } from '../../../features/minimap/Minimap';
import { eventEmitter } from '../../../features/minimap/minimapEvents';
import { indexToTimestamp, options } from '../../../globals';

interface MinimapScroll extends Plugin<'line'> {
    leftClickPressed: boolean;
    dataBuffer: Array<{ x: number; y: number | undefined }>;
    dataBufferStep: number;
    globalDataBufferIndex: number;
    localDataBufferIndex: number;
    updateMinimapData: (chart: MinimapChart) => void;
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
    dataBuffer: new Array((options.data.length / 1000) * 2),
    globalDataBufferIndex: 0,
    localDataBufferIndex: 0,

    beforeInit(chart: MinimapChart) {
        const { canvas } = chart.ctx;
        this.dataBuffer.fill({ x: 0, y: undefined });
        this.globalDataBufferIndex = 0;
        this.localDataBufferIndex = 0;

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
        eventEmitter.on('updateMinimap', () => {
            this.updateMinimapData(chart);
        });
        eventEmitter.on('clearMinimap', () => {
            this.clearMinimap(chart);
        });

        // In case data already exist
        this.updateMinimapData(chart);
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
        eventEmitter.removeListener('updateMinimap', () => {
            this.updateMinimapData(chart);
        });
        eventEmitter.removeListener('clearMinimap', () => {
            this.clearMinimap(chart);
        });
    },

    updateMinimapData(chart) {
        do {
            const accumulatedData = accumulateData(
                this.globalDataBufferIndex,
                this.dataBufferStep
            );
            this.dataBuffer[this.localDataBufferIndex] = accumulatedData[0];
            this.localDataBufferIndex += 1;
            this.dataBuffer[this.localDataBufferIndex] = accumulatedData[1];
            this.localDataBufferIndex += 1;

            this.globalDataBufferIndex += this.dataBufferStep;
        } while (
            this.globalDataBufferIndex + this.dataBufferStep <
            options.index
        );

        /* @ts-expect-error Have not figured out how to handle this */
        chart.data.datasets[0].data = this.dataBuffer;
        if (chart.options.scales?.x != null) {
            chart.options.scales.x.max = options.timestamp;
        }
        chart.update();

        if (this.globalDataBufferIndex > options.index) {
            // Redo last interval if options.index has not come far enough;
            // TODO: Make sure this is not async ?
            this.localDataBufferIndex -= 2;
            this.globalDataBufferIndex -= this.dataBufferStep;
        }
    },

    clearMinimap(chart) {
        this.dataBuffer.fill({ x: 0, y: undefined });
        this.globalDataBufferIndex = 0;
        this.localDataBufferIndex = 0;
        chart.data.datasets[0].data = [];
        if (chart.options.scales?.x != null) {
            chart.options.scales.x.max = options.timestamp;
        }
        chart.update();
    },
};

function accumulateData(indexBegin: number, numberOfSamples: number) {
    const { data } = options;

    let min: number | undefined = Number.MAX_VALUE;
    let max: number | undefined = Number.MIN_VALUE;

    for (
        let movingIndex = indexBegin;
        movingIndex <= indexBegin + numberOfSamples;
        movingIndex += 1
    ) {
        const value = data[movingIndex];

        if (value > max) {
            max = value;
        }
        if (min !== 0 && value < min) {
            min = value < 0 ? 0 : value;
        }
    }

    // We never expect this to happen, but if it would happen, it would lead
    // chart.js to hang without error. Making the app unusable without warning.
    // Hence, we'd rather want the points to be undefined.
    if (min === Number.MAX_VALUE) {
        min = undefined;
    }
    if (max === Number.MIN_VALUE) {
        max = undefined;
    }

    return [
        {
            x: indexToTimestamp(indexBegin),
            y: min,
        },
        {
            x: indexToTimestamp(indexBegin),
            y: max,
        },
    ];
}

export default plugin;
