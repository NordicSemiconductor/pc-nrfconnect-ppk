/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { Chart, Plugin } from 'chart.js';
import { colors, logger } from 'pc-nrfconnect-shared';

import type { MinimapChart } from '../../../features/minimap/Minimap';
import { options } from '../../../globals';

type MinimapScroll = Plugin<'line'>;

const plugin: MinimapScroll = {
    id: 'minimapScroll',
    beforeInit(chart: MinimapChart) {
        const { canvas } = chart.ctx;

        canvas.addEventListener('pointermove', event => {});
    },
};

export default plugin;
