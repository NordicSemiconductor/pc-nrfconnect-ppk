/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { colors } from 'pc-nrfconnect-shared';

import { indexToTimestamp } from '../../../globals';

const { gray700: color } = colors;

const plugin = {
    id: 'triggerorigin',

    afterDraw(chartInstance) {
        const {
            chartArea: { top, bottom },
            scales: { xScale },
            $context: {
                chart: { ctx },
            },
            options: { triggerOrigin },
        } = chartInstance;
        // const { ctx }
        if (!triggerOrigin) return;
        const x = Math.ceil(
            xScale.getPixelForValue(indexToTimestamp(triggerOrigin - 1))
        );
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
