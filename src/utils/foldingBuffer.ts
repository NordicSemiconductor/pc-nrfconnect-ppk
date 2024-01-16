/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import fs from 'fs-extra';
import path from 'path';

export type Data = { x: number; y: number };
export type ResultData = { x: number; y: number | undefined };
export type Collection = { length: number; min: Data[]; max: Data[] };

const foldData = (data: Data[], select: (a: number, b: number) => number) => {
    for (let i = 0; i < data.length / 2; i += 1) {
        const index = i * 2;
        data[i] = {
            x: (data[index].x + data[index + 1].x) / 2,
            y: select(data[index].y, data[index + 1].y),
        };
    }
};

export class FoldingBuffer {
    maxNumberOfElements = 10_000;
    numberOfTimesToFold = 1;
    lastElementFoldCount = 0;
    data: Collection;
    out: ResultData[];

    constructor() {
        this.data = {
            length: 0,
            min: Array(this.maxNumberOfElements),
            max: Array(this.maxNumberOfElements),
        };
        this.out = Array(this.maxNumberOfElements * 2);
    }

    #addDefault(timestamp: number) {
        this.data.min[this.data.length] = {
            x: timestamp,
            y: Number.MAX_VALUE,
        };
        this.data.max[this.data.length] = {
            x: timestamp,
            y: -Number.MAX_VALUE,
        };

        this.data.length += 1;
    }

    #fold() {
        this.numberOfTimesToFold *= 2;

        foldData(this.data.min, Math.min);
        foldData(this.data.max, Math.max);
        this.data.length /= 2;
    }

    addData(value: number, timestamp: number) {
        if (this.lastElementFoldCount === 0) {
            this.#addDefault(timestamp);
        }

        value *= 1000; // uA to nA

        // workaround to support log y axis
        if (value < 200) {
            value = 200;
        }

        this.lastElementFoldCount += 1;
        const alpha = 1 / this.lastElementFoldCount;
        this.data.min[this.data.length - 1] = {
            x:
                timestamp * alpha +
                this.data.min[this.data.length - 1].x * (1 - alpha),
            y: !Number.isNaN(value)
                ? Math.min(value, this.data.min[this.data.length - 1].y)
                : this.data.min[this.data.length - 1].y,
        };

        this.data.max[this.data.length - 1] = {
            x:
                timestamp * alpha +
                this.data.max[this.data.length - 1].x * (1 - alpha),
            y: !Number.isNaN(value)
                ? Math.max(value, this.data.max[this.data.length - 1].y)
                : this.data.max[this.data.length - 1].y,
        };

        if (this.lastElementFoldCount === this.numberOfTimesToFold) {
            this.lastElementFoldCount = 0;
        }

        if (this.data.length === this.maxNumberOfElements) {
            this.#fold();
        }
    }

    getData() {
        for (let i = 0; i < this.data.length; i += 1) {
            const isValid = this.data.max[i].y >= this.data.min[i].y;

            this.out[i * 2] = {
                x: this.data.min[i].x,
                y: isValid ? this.data.min[i].y : undefined,
            };
            this.out[i * 2 + 1] = {
                x: this.data.max[i].x,
                y: isValid ? this.data.max[i].y : undefined,
            };
        }
        return this.out.slice(0, this.data.length * 2);
    }

    saveToFile(sessionPath: string) {
        fs.writeFileSync(
            path.join(sessionPath, 'minimap.raw'),
            JSON.stringify({
                lastElementFoldCount: this.lastElementFoldCount,
                data: this.data,
                maxNumberOfElements: this.maxNumberOfElements,
                numberOfTimesToFold: this.numberOfTimesToFold,
            })
        );
    }

    loadFromFile(sessionPath: string) {
        const result = JSON.parse(
            fs.readFileSync(path.join(sessionPath, 'minimap.raw')).toString()
        );
        this.lastElementFoldCount = result.lastElementFoldCount;
        this.data = result.data;
        this.maxNumberOfElements = result.maxNumberOfElements;
        this.numberOfTimesToFold = result.numberOfTimesToFold;
    }
}
