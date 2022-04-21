import { options, timestampToIndex } from '../globals';

/**
 * Writes index, timestamp and optionally samplesPerSecond to the global options object.
 * @param {number} index what the current options.index should be
 * @param {number} [samplesPerSecond] what sample rate to use to synchronise the timestamp
 * @returns {void}: writes silently to the options object
 */
const synchronise_index_and_timestamp = (
    index: number,
    samplesPerSecond = 1e5
): void => {
    options.index = index;
    options.samplesPerSecond = samplesPerSecond;
    options.timestamp = index * samplesPerSecond;
};

beforeEach(() => {
    options.data = new Float32Array();
    options.index = 0;
    options.timestamp = undefined;
    options.samplesPerSecond = 1e5;
});

describe('timestampToIndex', () => {
    it('should return zero if timestamps are undefined', () => {
        expect(timestampToIndex(undefined)).toBe(0);
    });

    it('should return index equal to options.index if argument is undefined', () => {});
});
