/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Plugin } from 'chart.js';

import type { MinimapChart } from '../../../features/minimap/Minimap';
import { DataManager } from '../../../globals';

interface MinimapScroll extends Plugin<'line'> {
    updateMinimapData: (chart: MinimapChart) => void;
    clearMinimap: (chart: MinimapChart) => void;
}

let leftClickPressed = false;
let clickOnSlider = false;
let chartRef: MinimapChart;
let lastSliderTimeStamp = 0;
let lastClickDeltaFromCenter = 0;

const getClickMetaData = (chart: MinimapChart, offsetX: number) => {
    if (chart.windowNavigateCallback == null) return;
    if (chart.data.datasets[0].data.length === 0) return;

    const sliderOffsetX = chart.options.slider?.offsetX;
    const sliderWidth = chart.options.slider?.width;

    if (sliderOffsetX == null || sliderWidth == null) {
        return;
    }

    const clickedOnSlider =
        offsetX >= sliderOffsetX && offsetX <= sliderOffsetX + sliderWidth;

    let deltaOffSliderCenter = 0;
    if (clickedOnSlider) {
        deltaOffSliderCenter = offsetX - sliderOffsetX - sliderWidth / 2;
    }

    return {
        clickedOnSlider,
        deltaOffSliderCenter,
    };
};

const calculateSliderCenterXPosition = (
    chart: MinimapChart,
    offsetX: number,
    clickedOnSlider: boolean,
    deltaFromCenter: number
) => {
    if (chart.windowNavigateCallback == null) return;
    if (chart.data.datasets[0].data.length === 0) return;

    const windowDuration = chart.options.ampereChart?.windowDuration;
    const sliderOffsetX = chart.options.slider?.offsetX;
    const sliderWidth = chart.options.slider?.width;

    if (
        windowDuration == null ||
        sliderOffsetX == null ||
        sliderWidth == null
    ) {
        return;
    }

    const {
        scales: { x: xScale },
    } = chart;

    let newSliderCenterOffsetX = offsetX;
    if (clickedOnSlider) {
        newSliderCenterOffsetX = offsetX - deltaFromCenter;
    }

    const xPosition = xScale.getValueForPixel(newSliderCenterOffsetX);
    if (xPosition == null) return;

    const maxCenter = lastSliderTimeStamp - windowDuration / 2;
    const minCenter = windowDuration / 2;

    if (xPosition > maxCenter || xPosition < minCenter) {
        const metaData = getClickMetaData(chart, offsetX);
        if (metaData) {
            lastClickDeltaFromCenter = metaData.deltaOffSliderCenter;
        }
    }

    return Math.max(minCenter, Math.min(maxCenter, xPosition));
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
            clickOnSlider = metaData.clickedOnSlider;
            lastClickDeltaFromCenter = metaData.deltaOffSliderCenter;
            const center = calculateSliderCenterXPosition(
                chartRef,
                event.offsetX,
                false,
                0
            );
            if (!metaData.clickedOnSlider && center != null) {
                chartRef.windowNavigateCallback?.(center);
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
        const target = event.target;
        if (target instanceof Element) {
            target.setPointerCapture(event.pointerId);
        }
        const center = calculateSliderCenterXPosition(
            chartRef,
            event.offsetX,
            clickOnSlider,
            lastClickDeltaFromCenter
        );
        if (center != null) chartRef.windowNavigateCallback?.(center);
    } else {
        leftClickPressed = false;
    }
};

const plugin: MinimapScroll = {
    id: 'minimapScroll',

    beforeInit(chart: MinimapChart) {
        chartRef = chart;
        const { canvas } = chart.ctx;

        chart.onSliderRangeChange = (end, duration, liveMode) => {
            if (leftClickPressed && lastSliderTimeStamp < end) {
                return;
            }

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
    beforeDestroy(chart: MinimapChart) {
        const { canvas } = chart.ctx;
        canvas.removeEventListener('pointermove', pointerMove);

        canvas.removeEventListener('pointerdown', pointerDown);

        canvas.removeEventListener('pointerup', pointerUp);

        canvas.removeEventListener('pointerenter', pointerEnter);
    },

    updateMinimapData(chart) {
        if (!leftClickPressed) {
            const data = DataManager().getMinimapData();
            /* @ts-expect-error Have not figured out how to handle this */
            chart.data.datasets[0].data = data;
            if (chart.options.scales?.x != null) {
                chart.options.scales.x.max = DataManager().getTimestamp();
            }
            chart.update();
            chart.redrawSlider?.();
            if (data.length) lastSliderTimeStamp = data[data.length - 1].x;
        }
    },

    clearMinimap(chart) {
        chart.data.datasets[0].data = [];
        if (chart.options.scales?.x != null) {
            chart.options.scales.x.max = DataManager().getTimestamp();
        }
        chart.update();

        leftClickPressed = false;
        clickOnSlider = false;
        lastSliderTimeStamp = 0;
        lastClickDeltaFromCenter = 0;
    },
};

export default plugin;
