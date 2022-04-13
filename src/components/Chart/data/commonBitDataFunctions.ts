import { DigitalChannelState } from './dataTypes';

/**
 * @returns {DigitalChannelState[]} Array with length 4000, containing the BitState for the given timestamp,
 * where timestamp is the equivalent x coordinate and bitState is a BitState represented on the y-axis.
 *
 * The value <4000> has been chosen as a maximum or sufficient number of pixels to be available in the window at any given time.
 * The number of pixels is dynamically scaled by averaging over several samples when the user zooms out.
 */
export const emptyArray = () =>
    [...Array(4000)].map(
        () =>
            ({
                timestamp: undefined,
                bitState: undefined,
            } as DigitalChannelState)
    );
