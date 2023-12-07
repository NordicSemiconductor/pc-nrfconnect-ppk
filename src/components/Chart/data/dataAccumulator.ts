/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    DataManager,
    indexToTimestamp,
    normalizeTime,
    numberOfDigitalChannels,
} from '../../../globals';
import { always0, always1, sometimes0And1 } from '../../../utils/bitConversion';
import bitDataAccumulator, { BitDataAccumulator } from './bitDataAccumulator';
import {
    AmpereState,
    BitStateIndexType,
    BitStateType,
    DigitalChannelState,
    DigitalChannelStates,
    TimestampType,
} from './dataTypes';
import noOpBitDataProcessor from './noOpBitDataProcessor';

export const calcStats = (begin?: null | number, end?: null | number) => {
    if (begin == null || end == null) {
        return null;
    }

    if (begin > end) {
        const temp = begin;
        begin = end;
        end = temp;
    }

    begin = Math.max(begin, 0);
    end = Math.min(end, DataManager().getTimestamp());

    const data = DataManager().getData(begin, end);
    let sum = 0;
    let len = 0;
    let max;

    for (let n = 0; n < data.current.length; n += 1) {
        const v = data.current[n];
        if (!Number.isNaN(v)) {
            if (max === undefined || v > max) {
                max = v;
            }
            sum += v;
            len += 1;
        }
    }
    return {
        average: sum / (len || 1),
        max: max ?? 0,
        delta: end - begin,
    };
};

export interface DataAccumulator {
    bitStateAccumulator: number[];

    process: (
        begin: number,
        end: number,
        digitalChannelsToCompute: number[],
        len: number,
        windowDuration: number
    ) => {
        ampereLineData: AmpereState[];
        bitsLineData: DigitalChannelStates[];
        averageLine: AverageLine[];
    };
}

type AverageLine = { x: TimestampType; y: number; count: number };

type AccumulatedResult = {
    ampereLineData: AmpereState[];
    bitsLineData: DigitalChannelStates[];
    averageLine: AverageLine[];
};

let cachedResult: AccumulatedResult | undefined;

const accumulate = (
    begin: number, // normalizeTime
    end: number, // normalizeTime
    timeGroup: number,
    numberOfPointsPerGrouped: number,
    digitalChannelsToCompute: number[]
) => {
    begin = Math.floor(begin / timeGroup) * timeGroup;
    end = begin + Math.ceil((end - begin) / timeGroup) * timeGroup;

    const data = DataManager().getData(begin, end);

    const bitAccumulator = getDataProcessor(digitalChannelsToCompute);

    bitAccumulator.initialise(digitalChannelsToCompute);

    const noOfPointToRender = data.current.length / numberOfPointsPerGrouped;
    const needMinMaxLine = numberOfPointsPerGrouped !== 1;

    if (!needMinMaxLine) {
        const ampereLineData: AmpereState[] = new Array(
            Math.ceil(noOfPointToRender)
        );
        data.current.forEach((v, i) => {
            const timestamp = begin + i * timeGroup;
            if (!Number.isNaN(v) && data.bits && i < data.bits.length) {
                bitAccumulator.processBits(data.bits[i]);
                bitAccumulator.processAccumulatedBits(timestamp);
            }

            ampereLineData[i] = {
                x: timestamp,
                y: v * 1000,
            };
        });

        return {
            ampereLineData,
            bitsLineData: bitAccumulator.getLineData(),
            averageLine: ampereLineData.map(
                d => ({ ...d, count: 1 } as AverageLine)
            ),
        };
    }

    const ampereLineData: AmpereState[] = new Array(
        Math.ceil(noOfPointToRender) * 2
    );

    const averageLine: AverageLine[] = new Array(Math.ceil(noOfPointToRender));

    let min: number = Number.MAX_VALUE;
    let max: number = -Number.MAX_VALUE;

    let timestamp = begin;
    data.current.forEach((v, index) => {
        const firstItemInGrp = index % numberOfPointsPerGrouped === 0;
        const lastItemInGrp = (index + 1) % numberOfPointsPerGrouped === 0;
        const groupIndex = Math.floor(index / numberOfPointsPerGrouped);

        if (firstItemInGrp) {
            min = Number.MAX_VALUE;
            max = -Number.MAX_VALUE;

            averageLine[groupIndex] = {
                x: timestamp,
                y: 0,
                count: 0,
            };
        }

        if (!Number.isNaN(v)) {
            if (v * 1000 > max) max = v * 1000; // uA to nA
            if (v * 1000 < min) min = v * 1000; // uA to nA

            if (data.bits && index < data.bits.length) {
                bitAccumulator.processBits(data.bits[index]);
            }

            averageLine[groupIndex] = {
                x: timestamp,
                y: averageLine[groupIndex].y + v,
                count: averageLine[groupIndex].count + 1,
            };
        }

        ampereLineData[groupIndex * 2] = {
            x: timestamp,
            y: min > max ? undefined : min,
        };

        ampereLineData[(groupIndex + 1) * 2 - 1] = {
            x: timestamp,
            y: min > max ? undefined : max,
        };

        if (lastItemInGrp) {
            timestamp += timeGroup;
            if (min <= max) {
                bitAccumulator.processAccumulatedBits(timestamp);
            }
        }
    });

    return {
        ampereLineData,
        bitsLineData: bitAccumulator.getLineData(),
        averageLine,
    };
};

const removeCurrentSamplesOutsideScopes = <T extends AmpereState | AverageLine>(
    current: T[],
    begin: number,
    end: number
) => current.filter(v => v.x !== undefined && v.x >= begin && v.x <= end);

const removeDigitalChannelsSamplesOutsideScopes = (
    dataChannel: DigitalChannelState[],
    begin: number,
    end: number
) => {
    if (dataChannel.length > 1) {
        return [
            {
                x: begin,
                y: dataChannel[0].y,
            },
            ...dataChannel.slice(1, dataChannel.length - 2),
            {
                x: end,
                y: dataChannel[dataChannel.length - 1].y,
            },
        ];
    }

    return [];
};

const removeDigitalChannelStateSamplesOutsideScopes = (
    dataChannel: DigitalChannelStates,
    begin: number,
    end: number
) => ({
    mainLine: removeDigitalChannelsSamplesOutsideScopes(
        dataChannel.mainLine,
        begin,
        end
    ),
    uncertaintyLine: removeDigitalChannelsSamplesOutsideScopes(
        dataChannel.uncertaintyLine,
        begin,
        end
    ),
});

const removeDigitalChannelsStatesSamplesOutsideScopes = (
    dataChannel: DigitalChannelStates[],
    begin: number,
    end: number
) =>
    dataChannel.map(c =>
        removeDigitalChannelStateSamplesOutsideScopes(c, begin, end)
    );

const findMissingRanges = (
    accumulatedResult: AccumulatedResult,
    begin: number,
    end: number
) => {
    const timestamps =
        accumulatedResult.ampereLineData
            .filter(v => v.x !== undefined)
            .map(v => v.x as number) ?? [];
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);

    const result: { begin: number; end: number; location: 'front' | 'back' }[] =
        [];

    if (min > begin) {
        result.push({
            begin,
            end: Math.max(begin, min - indexToTimestamp(1)),
            location: 'front',
        });
    }

    if (max < end) {
        result.push({
            begin: Math.min(end, max + indexToTimestamp(1)),
            end,
            location: 'back',
        });
    }

    return result;
};

let cacheValidTimeGroup: number;
let cachedDigitalChannelsToCompute: number[];

const stateToIndex = (
    mainLineState: BitStateType | undefined,
    uncertaintyLineState: BitStateType | undefined
): BitStateIndexType => {
    if (mainLineState === undefined && uncertaintyLineState === undefined) {
        return 0;
    }
    if (
        mainLineState === BitStateType.one &&
        uncertaintyLineState === BitStateType.one
    ) {
        return always1;
    }
    if (
        mainLineState === BitStateType.zero &&
        uncertaintyLineState === BitStateType.zero
    ) {
        return always0;
    }

    return sometimes0And1;
};

const joinBitLines = (
    begin: number,
    end: number,
    dataLines: DigitalChannelStates[][],
    digitalChannelsToCompute: number[]
) => {
    const timestamp: TimestampType[] = Array(8).fill(undefined);
    const bitDataProcessor = getDataProcessor(digitalChannelsToCompute);
    bitDataProcessor.initialise(digitalChannelsToCompute);

    dataLines = dataLines.filter(d => d.length > 0);

    dataLines.forEach(dataLine => {
        dataLine.forEach((line, index) => {
            const numberOfElement = Math.min(
                line.mainLine.length,
                line.uncertaintyLine.length
            );
            for (let i = 0; i < numberOfElement; i += 1) {
                bitDataProcessor.processBitState(
                    stateToIndex(line.mainLine[i].y, line.uncertaintyLine[i].y),
                    index
                );

                if (timestamp[index] !== line.mainLine[i].x) {
                    timestamp[index] = line.mainLine[i].x;
                    bitDataProcessor.processAccumulatedBits(timestamp[index]);
                }
            }
        });
    });

    return bitDataProcessor.getLineData();
};

const getDataProcessor = (digitalChannelsToCompute: number[]) =>
    digitalChannelsToCompute.length > 0
        ? bitDataAccumulator()
        : (noOpBitDataProcessor() as BitDataAccumulator); // BitDataAccumulator is not the correct type. keeping old solution for now

// true is rhs has all elements from lhs
const compareDigitalChanel = (rhs: number[], lhs: number[]) =>
    lhs.every(v => rhs.findIndex(x => x === v) !== -1);

export type DataAccumulatorInitialiser = () => DataAccumulator;
export default (): DataAccumulator => ({
    bitStateAccumulator: new Array(numberOfDigitalChannels),

    process(
        begin,
        end,
        digitalChannelsToCompute,
        maxNumberOfPoints,
        windowDuration
    ) {
        // We want an extra sample from both end to show line going out of chart
        begin = Math.max(0, normalizeTime(begin)); // normalizeTime floors

        end = Math.min(
            DataManager().getTimestamp(),
            normalizeTime(end) === end
                ? end
                : normalizeTime(end) + DataManager().getSamplingTime()
        );

        if (maxNumberOfPoints === 0) {
            return {
                ampereLineData: [],
                bitsLineData: [],
                averageLine: [],
            };
        }

        const suggestedNoOfRawSamples =
            DataManager().getNumberOfSamplesInWindow(windowDuration);

        const numberOfPointsPerGroup = Math.ceil(
            suggestedNoOfRawSamples / maxNumberOfPoints
        );

        const timeGroup = indexToTimestamp(numberOfPointsPerGroup);

        if (
            timeGroup !== cacheValidTimeGroup ||
            !compareDigitalChanel(
                cachedDigitalChannelsToCompute,
                digitalChannelsToCompute
            )
        ) {
            cachedResult = undefined;
        }

        cacheValidTimeGroup = timeGroup;
        cachedDigitalChannelsToCompute = digitalChannelsToCompute;

        end = Math.min(DataManager().getTimestamp(), end);

        const getDataWithCachedResult = () => {
            if (!cachedResult || DataManager().getTotalSavedRecords() === 0)
                return accumulate(
                    begin,
                    end,
                    timeGroup,
                    numberOfPointsPerGroup,
                    digitalChannelsToCompute
                );

            const requiredEnd = Math.min(
                Math.ceil(end / timeGroup) * timeGroup,
                DataManager().getTimestamp()
            );

            const requiredBegin = Math.floor(begin / timeGroup) * timeGroup;

            const usableCachedData: AccumulatedResult = {
                ampereLineData: removeCurrentSamplesOutsideScopes(
                    cachedResult.ampereLineData,
                    requiredBegin,
                    requiredEnd
                ),
                bitsLineData: removeDigitalChannelsStatesSamplesOutsideScopes(
                    cachedResult.bitsLineData,
                    requiredBegin,
                    requiredEnd
                ),
                averageLine: removeCurrentSamplesOutsideScopes(
                    cachedResult.averageLine,
                    requiredBegin,
                    requiredEnd
                ),
            };

            if (usableCachedData.ampereLineData.length === 0) {
                return accumulate(
                    begin,
                    end,
                    timeGroup,
                    numberOfPointsPerGroup,
                    digitalChannelsToCompute
                );
            }

            const rangesToLoad = findMissingRanges(
                usableCachedData,
                begin,
                end
            );

            const loadedData = rangesToLoad.map(r => ({
                location: r.location,
                ...accumulate(
                    r.begin,
                    r.end,
                    timeGroup,
                    numberOfPointsPerGroup,
                    digitalChannelsToCompute
                ),
            }));

            const frontData = loadedData.find(d => d.location === 'front');
            const backData = loadedData.find(d => d.location === 'back');

            return {
                ampereLineData: [
                    ...(frontData?.ampereLineData ?? []),
                    ...usableCachedData.ampereLineData,
                    ...(backData?.ampereLineData ?? []),
                ],
                bitsLineData: joinBitLines(
                    begin,
                    end,
                    [
                        frontData?.bitsLineData ?? [],
                        usableCachedData.bitsLineData,
                        backData?.bitsLineData ?? [],
                    ],
                    digitalChannelsToCompute
                ),
                averageLine: [
                    ...(frontData?.averageLine ?? []),
                    ...usableCachedData.averageLine,
                    ...(backData?.averageLine ?? []),
                ],
            };
        };

        cachedResult = getDataWithCachedResult();

        return {
            ampereLineData: cachedResult.ampereLineData,
            bitsLineData: cachedResult.bitsLineData,
            averageLine: cachedResult.averageLine,
        };
    },
});
