/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
import { testUtils } from 'pc-nrfconnect-shared';

import appReducer from '../reducers';

jest.mock('pc-nrfconnect-shared', () => ({
    ...jest.requireActual('pc-nrfconnect-shared'),
    getAppDir: () => '/mocked/data/dir',
    getAppDataDir: () => 'mocked/data/dir',
    getLastSaveDir: () => 'mocked/data/dir',
    getPersistentStore: jest.fn().mockImplementation(() => ({
        get: (_, defaultVal) => defaultVal,
        set: jest.fn(),
    })),
}));

window.ResizeObserver = function ResizeObserverStub() {
    this.observe = () => {};
    this.disconnect = () => {};
};

const render = testUtils.render(appReducer);

export * from '@testing-library/react';
export { render };
