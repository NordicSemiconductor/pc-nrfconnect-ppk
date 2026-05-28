/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/**
 * Lightweight, allocation-free tap on the live sample stream so the embedded
 * MCP server can report current measurements without touching the chart's
 * DataManager. deviceActions feeds every recorded sample (in µA) here; the MCP
 * `measure` tool reads back a recent window.
 */

const CAPACITY = 200_000; // ~2 s at the 100 kHz scope rate

const values = new Float64Array(CAPACITY);
let writeIndex = 0;
let total = 0;

export const recordSample = (microAmps: number): void => {
    values[writeIndex] = microAmps;
    writeIndex = (writeIndex + 1) % CAPACITY;
    total += 1;
};

// Monotonic count of samples seen since process start.
export const sampleCount = (): number => total;

export interface TapStats {
    count: number;
    averageMicroAmps: number;
    minMicroAmps: number;
    maxMicroAmps: number;
}

// Aggregate the most recent `n` samples (bounded by the ring capacity).
export const statsForLast = (n: number): TapStats | null => {
    const available = Math.min(total, CAPACITY);
    const count = Math.min(Math.max(0, Math.floor(n)), available);
    if (count === 0) return null;

    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < count; i += 1) {
        const idx = (writeIndex - 1 - i + CAPACITY) % CAPACITY;
        const v = values[idx];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return {
        count,
        averageMicroAmps: sum / count,
        minMicroAmps: min,
        maxMicroAmps: max,
    };
};
