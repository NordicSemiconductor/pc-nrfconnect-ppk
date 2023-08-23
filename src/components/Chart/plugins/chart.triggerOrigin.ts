/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Plugin } from 'chart.js';
import { colors } from 'pc-nrfconnect-shared';

import { indexToTimestamp } from '../../../globals';
import type { AmpereChartJS } from '../AmpereChart';

const { gray700: color } = colors;

const plugin: Plugin<'line'> = {
    id: 'triggerorigin',

    afterDraw(chartInstance: AmpereChartJS) {
        const {
            chartArea: { top, bottom },
            scales: { xScale },
            ctx,
            options: { triggerOrigin },
        } = chartInstance;

        if (!triggerOrigin) return;

        const timestamp = indexToTimestamp(triggerOrigin - 1);
        if (timestamp == null) return;

        const x = Math.ceil(xScale.getPixelForValue(timestamp));

        if (x < xScale.left || x > xScale.right) return;

        ctx.save();

        function drawDashedLine() {
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = color;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        }

        drawDashedLine();

        ctx.restore();
    },
};

export default plugin;
