/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const EventAction = {
    BUFFER_SIZE_CHANGED: 'Sampling buffer size changed',
    VOLTAGE_MAX_LIMIT_CHANGED: 'Max voltage limit changed',
    VOLTAGE_MAX_LIMIT_RESET:
        'Max Voltage limit changed because PPK1 was selected',
    PPK_1_SELECTED: 'PPK1 selected',
    PPK_2_SELECTED: 'PPK2 selected',
    Y_MIN_SET_EXPLICITLY: 'YMin was explicitly changed',
    Y_MAX_SET_EXPLICITLY: 'YMax was explicitly changed',
    START_DATA_LOGGER_SAMPLE: 'Data Logger sampling started',
    START_REAL_TIME_SAMPLE: 'Real Time sampling started',
    SAMPLE_STARTED_WITH_PPK1_SELECTED: 'Sample started with PPK1 selected',
    SAMPLE_STARTED_WITH_PPK2_SELECTED: 'Sample started with PPK2 selected',
    EXPORT_DATA: 'Export data',
};

export default EventAction;
