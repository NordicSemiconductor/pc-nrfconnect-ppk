/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */
import {
    DigitalChannelTriggerStatesEnum,
    TriggerEdge,
} from '../../slices/triggerSlice';
import { digitalChannelStateTupleOf8 } from '../../utils/persistentStore';
import {
    checkAnalogTriggerValidity,
    checkDigitalTriggerValidity,
} from '../deviceActions';

// Mock the Electron dependencies before importing deviceActions
jest.mock(
    '@nordicsemiconductor/pc-nrfconnect-shared/ipc/launcherConfig',
    () => ({
        getConfig: jest.fn(() => ({ appDataDir: '/mock/app/data' })),
    })
);

jest.mock('electron', () => ({
    ipcRenderer: {
        sendSync: jest.fn(),
    },
}));

jest.mock('../../utils/FileBuffer', () => ({}));
jest.mock('../../globals', () => ({}));

// Format of the string is "HLLLXXAA"
function strToTriggerStateArray(state: string): digitalChannelStateTupleOf8 {
    if (state.length !== 8) {
        throw new Error('State string must be exactly 8 characters long');
    }
    return state.split('').map(char => {
        switch (char) {
            case 'H':
                return DigitalChannelTriggerStatesEnum.High;
            case 'L':
                return DigitalChannelTriggerStatesEnum.Low;
            case 'X':
                return DigitalChannelTriggerStatesEnum.Off;
            case '*':
                return DigitalChannelTriggerStatesEnum.Any;
            default:
                throw new Error(`Invalid character in state string: ${char}`);
        }
    }) as digitalChannelStateTupleOf8;
}

describe('checkAnalogTriggerValidity', () => {
    describe('Rising Edge trigger', () => {
        test('returns true when previous value is below threshold and current value crosses above', () => {
            const result = checkAnalogTriggerValidity(
                5.0, // cappedValue
                3.0, // prevCappedValue
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(true);
        });

        test('returns true when current value equals threshold and previous was below', () => {
            const result = checkAnalogTriggerValidity(
                4.0, // cappedValue (exactly at threshold)
                3.0, // prevCappedValue
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(true);
        });

        test('returns false when previous value is undefined', () => {
            const result = checkAnalogTriggerValidity(
                5.0, // cappedValue
                undefined, // prevCappedValue
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(false);
        });

        test('returns false when previous value is above threshold', () => {
            const result = checkAnalogTriggerValidity(
                5.0, // cappedValue
                4.5, // prevCappedValue (above threshold)
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(false);
        });

        test('returns false when current value is below threshold', () => {
            const result = checkAnalogTriggerValidity(
                3.5, // cappedValue (below threshold)
                3.0, // prevCappedValue
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(false);
        });

        test('returns false when both values are above threshold', () => {
            const result = checkAnalogTriggerValidity(
                5.0, // cappedValue
                4.5, // prevCappedValue
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(false);
        });
    });

    describe('Falling Edge trigger', () => {
        test('returns true when previous value is above threshold and current value crosses below', () => {
            const result = checkAnalogTriggerValidity(
                3.0, // cappedValue
                5.0, // prevCappedValue
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(true);
        });

        test('returns true when current value equals threshold and previous was above', () => {
            const result = checkAnalogTriggerValidity(
                4.0, // cappedValue (exactly at threshold)
                5.0, // prevCappedValue
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(true);
        });

        test('returns false when previous value is undefined', () => {
            const result = checkAnalogTriggerValidity(
                3.0, // cappedValue
                undefined, // prevCappedValue
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(false);
        });

        test('returns false when previous value is below threshold', () => {
            const result = checkAnalogTriggerValidity(
                3.0, // cappedValue
                3.5, // prevCappedValue (below threshold)
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(false);
        });

        test('returns false when current value is above threshold', () => {
            const result = checkAnalogTriggerValidity(
                4.5, // cappedValue (above threshold)
                5.0, // prevCappedValue
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(false);
        });

        test('returns false when both values are below threshold', () => {
            const result = checkAnalogTriggerValidity(
                3.0, // cappedValue
                3.5, // prevCappedValue
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(false);
        });
    });

    describe('Invalid trigger edge', () => {
        test('returns false for unknown trigger edge type', () => {
            const result = checkAnalogTriggerValidity(
                5.0, // cappedValue
                3.0, // prevCappedValue
                4.0, // triggerLevel
                'Invalid Edge' as TriggerEdge
            );
            expect(result).toBe(false);
        });
    });

    describe('Edge cases with exact threshold values', () => {
        test('rising edge: returns false when previous equals threshold', () => {
            const result = checkAnalogTriggerValidity(
                5.0, // cappedValue
                4.0, // prevCappedValue (exactly at threshold)
                4.0, // triggerLevel
                'Rising Edge'
            );
            expect(result).toBe(false);
        });

        test('falling edge: returns false when previous equals threshold', () => {
            const result = checkAnalogTriggerValidity(
                3.0, // cappedValue
                4.0, // prevCappedValue (exactly at threshold)
                4.0, // triggerLevel
                'Falling Edge'
            );
            expect(result).toBe(false);
        });
    });
});

describe('checkDigitalTriggerValidity', () => {
    describe('AND logic', () => {
        test('returns true when all enabled channels match their required states', () => {
            const result = checkDigitalTriggerValidity(
                0b00000001,
                undefined,
                strToTriggerStateArray('HXXXXXXX'),
                'AND'
            );
            // This should return false because channel 0 expects High but bit is 0
            expect(result).toBe(true);
        });

        test('returns true when all enabled channels match their required states', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001,
                0b11110000,
                strToTriggerStateArray('HLLLHHHH'),
                'AND'
            );
            // This should return false because channel 0 expects High but bit is 0
            expect(result).toBe(true);
        });

        test('returns true when all enabled channels match (all High)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000,
                0b00000000,
                strToTriggerStateArray('XXXXHHHH'),
                'AND'
            );
            expect(result).toBe(true);
        });

        test('returns true when all enabled channels match their required states (High)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001, // channels 7,6,5,4,0 are high
                0b11110000, // channels 7,6,5,4 were high, 0 was low
                strToTriggerStateArray('HXXXXXXX'), // channel 0 expects High
                'AND'
            );
            expect(result).toBe(true);
        });

        test('returns true when all enabled channels match their required states (Low)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000, // channel 0 is low
                0b11110001, // channel 0 was high
                strToTriggerStateArray('LXXXXXXX'), // channel 0 expects Low
                'AND'
            );
            expect(result).toBe(true);
        });

        test('returns true when all enabled channels match their required states (Any)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001, // channel 0 changed from 0 to 1
                0b11110000,
                strToTriggerStateArray('*XXXXXXX'), // channel 0 expects Any change
                'AND'
            );
            expect(result).toBe(true);
        });

        test('returns true when multiple channels all match (mixed states)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001, // channels: 0=1, 1=0, 4=1
                0b11110010, // channels: 0=0, 1=1, 4=1
                strToTriggerStateArray('HLXXHXXX'), // 0=High, 1=Low, 4=High others off
                'AND'
            );
            expect(result).toBe(true);
        });

        test('returns false when no bits changed', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000,
                0b11110000, // same as current
                strToTriggerStateArray('HXXXXXXX'),
                'AND'
            );
            expect(result).toBe(false);
        });

        test('returns false when no relevant changes (only disabled channels changed)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000, // channel 1 changed
                0b11110010,
                strToTriggerStateArray('HXXXXXXX'), // only channel 0 is enabled, but it didn't change
                'AND'
            );
            expect(result).toBe(false);
        });
    });

    describe('OR logic', () => {
        test('returns true when one channel transitions from Low to High', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001, // channel 0 is now high
                0b11110000, // channel 0 was low
                strToTriggerStateArray('HXXXXXXX'), // channel 0 expects High transition
                'OR'
            );
            expect(result).toBe(true);
        });

        test('returns true when one channel transitions from High to Low', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000, // channel 0 is now low
                0b11110001, // channel 0 was high
                strToTriggerStateArray('LXXXXXXX'), // channel 0 expects Low transition
                'OR'
            );
            expect(result).toBe(true);
        });

        test('returns true when any enabled channel changes (Any state)', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001, // channel 0 changed
                0b11110000,
                strToTriggerStateArray('*XXXXXXX'), // channel 0 expects Any change
                'OR'
            );
            expect(result).toBe(true);
        });

        test('returns true when at least one of multiple channels satisfies condition', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001, // channel 0: 0->1 (satisfies High), channel 1: 1->0 (doesn't satisfy High)
                0b11110010,
                strToTriggerStateArray('HHXXXXXX'), // both channels 0,1 expect High transition
                'OR'
            );
            expect(result).toBe(true);
        });

        test('returns false when no enabled channels satisfy their conditions', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000, // channel 0: 1->0 (expects High transition but got Low)
                0b11110001,
                strToTriggerStateArray('HXXXXXXX'), // channel 0 expects High transition
                'OR'
            );
            expect(result).toBe(false);
        });

        test('returns false when channels change but wrong direction', () => {
            const result = checkDigitalTriggerValidity(
                0b11110010, // channel 0: 1->0, channel 1: 0->1
                0b11110001,
                strToTriggerStateArray('HLXXXXXX'), // 0 expects High (but went low), 1 expects Low (but went high)
                'OR'
            );
            expect(result).toBe(false);
        });
    });

    describe('Edge cases', () => {
        test('returns false when all channels are disabled', () => {
            const result = checkDigitalTriggerValidity(
                0b11110001,
                0b11110000,
                strToTriggerStateArray('XXXXXXXX'), // all channels off
                'AND'
            );
            expect(result).toBe(false);
        });

        test('returns false when bits are identical', () => {
            const result = checkDigitalTriggerValidity(
                0b11110000,
                0b11110000, // same value
                strToTriggerStateArray('HXXXXXXX'),
                'OR'
            );
            expect(result).toBe(false);
        });

        describe('Bit position validation', () => {
            test('correctly identifies bit changes in different positions', () => {
                // Test each bit position individually
                for (let i = 0; i < 8; i += 1) {
                    // eslint-disable-next-line no-bitwise
                    const currentBits = 1 << i; // set bit i
                    const prevBits = 0; // all bits were 0
                    const triggerStates = Array(8).fill(
                        DigitalChannelTriggerStatesEnum.Off
                    );
                    triggerStates[i] = DigitalChannelTriggerStatesEnum.High;

                    const result = checkDigitalTriggerValidity(
                        currentBits,
                        prevBits,
                        triggerStates as digitalChannelStateTupleOf8,
                        'AND'
                    );
                    expect(result).toBe(true);
                }
            });
        });
    });
});
