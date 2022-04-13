export type DigitalChannels = boolean[];
export type BitState = undefined | 0.4 | -0.4;
export type BitNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Timestamp = undefined | number;

/**
 * Represents a given state for a given digital channel
 * @var {Timestamp} timestamp: the corresponding timestamp of the given bit state: x-value in the Chart.
 * @var {BitState} bitState: the state of the digital channel in the given time stamp: y-value in the Chart.
 */
export interface DigitalChannelState {
    timestamp: Timestamp;
    bitState: BitState;
}

/**
 * Represents all States for a given digital channel
 * @var {DigitalChannelState[]} mainLine: is the dominating state of the digital channel in a given time interval
 * @var {DigitalChannelState[]} uncertaintyLine: is the ...TODO:
 */
export interface DigitalChannelStates {
    mainLine: DigitalChannelState[];
    uncertaintyLine: DigitalChannelState[];
}
