/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
import { testUtils } from '@nordicsemiconductor/pc-nrfconnect-shared/test';

import appReducer from '../slices';

jest.mock('@nordicsemiconductor/pc-nrfconnect-shared', () => ({
    ...jest.requireActual('@nordicsemiconductor/pc-nrfconnect-shared'),
    getAppDir: () => '/mocked/data/dir',
    getAppDataDir: () => 'mocked/data/dir',
    getLastSaveDir: () => 'mocked/data/dir',
    getPersistentStore: jest.fn().mockImplementation(() => ({
        get: (_: unknown, defaultVal: unknown) => defaultVal,
        set: jest.fn(),
    })),
}));

// window.ResizeObserver = function ResizeObserverStub() {
//    this.observe = () => {};
//    this.disconnect = () => {};
// };

const render = testUtils.render(appReducer);

export * from '@testing-library/react';
export { render };
