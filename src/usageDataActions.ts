/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const EventAction = {
    BUFFER_SIZE_CHANGED: 'Sampling buffer size changed',
    VOLTAGE_MAX_LIMIT_CHANGED: 'Max voltage limit changed',
    PPK_1_SELECTED: 'PPK1 selected',
    PPK_2_SELECTED: 'PPK2 selected',
    Y_MIN_SET_EXPLICITLY: 'YMin was explicitly changed',
    Y_MAX_SET_EXPLICITLY: 'YMax was explicitly changed',
    START_DATA_LOGGER_SAMPLE: 'Data Logger sampling started',
    START_REAL_TIME_SAMPLE: 'Real Time sampling started',
};

export default EventAction;
