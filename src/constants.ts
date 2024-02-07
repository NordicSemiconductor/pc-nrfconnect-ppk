/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const PPKCommands = {
    TriggerSet: 0x01,
    AvgNumSet: 0x02, // (no-firmware)
    TriggerWindowSet: 0x03,
    TriggerIntervalSet: 0x04, // (no-firmware)
    TriggerSingleSet: 0x05,
    AverageStart: 0x06,
    AverageStop: 0x07,
    RangeSet: 0x08, // (no-firmware)
    LCDSet: 0x09, // (no-firmware)
    DeviceRunningSet: 0x0c,
    RegulatorSet: 0x0d,
    SwitchPointDown: 0x0e,
    SwitchPointUp: 0x0f,
    TriggerExtToggle: 0x11,
    SetPowerMode: 0x11,
    ResUserSet: 0x12,
    SpikeFilteringOn: 0x15,
    SpikeFilteringOff: 0x16,
    GetMetadata: 0x19,
    Reset: 0x20,
    SetUserGains: 0x25,
};

type PPKCommands = number[];

export default PPKCommands;
