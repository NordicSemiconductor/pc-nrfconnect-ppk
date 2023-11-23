/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

export type Data = { x: number; y: number };

const foldData = (data: Data[], select: (a: number, b: number) => number) => {
    const newData = Array<Data>(data.length / 2);

    for (let i = 0; i < newData.length; i += 1) {
        const index = i * 2;
        newData[i] = {
            x: (data[index].x + data[index + 1].x) / 2,
            y: select(data[index].y, data[index + 1].y),
        };
    }

    return newData;
};

export class FoldingBuffer {
    min: Data[] = [];
    max: Data[] = [];
    maxNumberOfElements = 10000;
    numberOfTimesToFold = 1;
    lastElementFoldCount = 0;

    private addDefault(timestamp: number) {
        this.min.push({ x: timestamp, y: Number.MAX_VALUE });
        this.max.push({ x: timestamp, y: -Number.MAX_VALUE });
    }

    addData(value: number, timestamp: number) {
        if (this.lastElementFoldCount === 0) {
            this.addDefault(timestamp);
        }

        this.lastElementFoldCount += 1;
        const alpha = 1 / this.lastElementFoldCount;
        this.min[this.min.length - 1] = {
            x:
                timestamp * (1 - alpha) +
                this.min[this.min.length - 1].x * alpha,
            y: Math.min(value, this.min[this.min.length - 1].y),
        };

        this.max[this.max.length - 1] = {
            x:
                timestamp * (1 - alpha) +
                this.max[this.max.length - 1].x * alpha,
            y: Math.max(value, this.max[this.max.length - 1].y),
        };

        if (this.lastElementFoldCount === this.numberOfTimesToFold) {
            this.lastElementFoldCount = 0;
        }

        if (this.min.length === this.maxNumberOfElements) {
            this.fold();
        }
    }

    private fold() {
        this.numberOfTimesToFold *= 2;

        this.min = foldData(this.min, Math.min);
        this.max = foldData(this.max, Math.max);
    }

    getData() {
        return [
            ...this.min.slice(0, this.min.length - 2),
            this.max.slice(0, this.min.length - 2),
        ];
    }
}
