/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import Store from 'electron-store';
import { getAppDataDir } from 'pc-nrfconnect-shared';

const persistentStore = new Store({ name: 'pc-nrfconnect-ppk' });

export default persistentStore;

export const lastSaveDir = () =>
    persistentStore.get('lastSaveDir', getAppDataDir());
export const setLastSaveDir = dir => persistentStore.set('lastSaveDir', dir);
