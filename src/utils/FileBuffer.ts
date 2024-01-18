/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';
import fs from 'fs-extra';
import path from 'path';

type Page = {
    page: Uint8Array;
    startAddress: number;
    bytesWritten: number;
};

const defaultPage = () => ({
    page: new Uint8Array(),
    startAddress: 0,
    bytesWritten: 0,
});

type Range = { start: number; end: number };

const overlaps = (r1: Range, r2: Range) =>
    (r1.start <= r2.start && r2.start <= r1.end) ||
    (r1.start <= r2.end && r2.start <= r1.end);

const fullOverlap = (outer: Range, inner: Range) =>
    outer.start <= inner.start && outer.end >= inner.end;

const mergeRange = (r1: Range, r2: Range): Range[] => {
    if (overlaps(r1, r2)) {
        return [
            {
                start: Math.min(r1.start, r2.start),
                end: Math.max(r1.end, r2.end),
            },
        ];
    }

    if (r1.end + 1 === r2.start) {
        return [
            {
                start: r1.start,
                end: r2.end,
            },
        ];
    }

    if (r2.end + 1 === r1.start) {
        return [
            {
                start: r2.start,
                end: r1.end,
            },
        ];
    }

    return [r1, r2];
};

const mergeRanges = (ranges: Range[]): Range[] => {
    const result: Range[] = [];

    while (ranges.length > 0) {
        let merged = false;

        const r1 = ranges.pop();
        if (!r1) return result;

        ranges = ranges.map(r2 => {
            const m = mergeRange(r1, r2);
            if (m.length === 1) {
                merged = true;
                return m[0];
            }

            return r2;
        });

        if (!merged) {
            result.push(r1);
        }
    }

    return result;
};
export class FileBuffer {
    readPages: Page[] = [];
    writePages: Page[] = [];

    numberOfWritePages = 30;
    numberOfReadPages = 20;
    fileHandle: number;
    filePath: string;
    readPageSize: number;
    writePageSize: number;
    fileOperationTasks: (() => Promise<void>)[] = [];
    fileSize = 0;
    bytesWritten = 0;
    fileBusy = false;
    beforeUnload: () => void;
    bufferingListeners: ((event: Promise<void>) => void)[] = [];
    freeWriteBuffers: Uint8Array[] = [];
    freeReadBuffers: Uint8Array[] = [];
    bufferingRequests: Promise<void>[] = [];
    cancelBufferOperations: WeakMap<Promise<void>, AbortController> =
        new WeakMap();

    constructor(
        readBufferSize: number,
        writeBufferSize: number,
        filePath: fs.PathLike,
        numberOfWritePages = 14,
        numberOfReadPages = 2
    ) {
        if (numberOfWritePages < 2) {
            throw new Error('numberOfWritePages cannot be less then 2');
        }

        if (numberOfReadPages < 1) {
            throw new Error('numberOfReadPages cannot be less then 1');
        }

        this.numberOfReadPages = numberOfReadPages;
        this.numberOfWritePages = numberOfWritePages;

        this.readPageSize = readBufferSize;
        this.writePageSize = writeBufferSize;

        // loading from existing session
        this.filePath = path.join(filePath.toString(), 'session.raw');
        if (fs.existsSync(filePath)) {
            logger.info(
                `Loading temporary ppk session file sessionFile ${filePath}`
            );
            this.fileSize = fs.statSync(this.filePath).size;
        } else {
            // new session
            fs.mkdirSync(filePath);
            logger.info(
                `Creating temporary ppk session file sessionFile ${filePath}`
            );
        }

        this.fileHandle = fs.openSync(this.filePath, 'as+');

        this.beforeUnload = this.release.bind(this);
        window.addEventListener('beforeunload', this.beforeUnload);
    }

    private getAllPages() {
        return [...this.readPages, ...this.writePages];
    }

    private writeActivePage(onComplete?: () => void) {
        if (this.writePages.length === 0) {
            onComplete?.();
            return;
        }
        const activePage = this.writePages[this.writePages.length - 1];

        if (activePage.bytesWritten === activePage.page.length) {
            this.fileOperationTasks.push(() =>
                fs
                    .appendFile(this.fileHandle, activePage.page)
                    .finally(onComplete)
            );
        } else {
            this.fileOperationTasks.push(() =>
                fs
                    .appendFile(
                        this.fileHandle,
                        activePage.page.subarray(0, activePage.bytesWritten)
                    )
                    .finally(onComplete)
            );
            this.writePages.push({
                startAddress: this.fileSize,
                bytesWritten: 0,
                page:
                    this.freeWriteBuffers.pop() ??
                    Buffer.alloc(this.writePageSize),
            });
        }
        this.executeFileOperation();
    }

    private updateCacheWrite(data: Uint8Array, onComplete?: () => void) {
        const normalizedEnd =
            Math.ceil((this.fileSize + data.length) / this.writePageSize) *
                this.writePageSize -
            1;

        const idealBufferRange: Range = {
            start: Math.max(
                0,
                1 + normalizedEnd - this.numberOfWritePages * this.writePageSize
            ),
            end: normalizedEnd,
        };

        this.writePages = this.writePages.filter(p => {
            const keep = overlaps(idealBufferRange, {
                start: p.startAddress,
                end: p.startAddress + p.bytesWritten - 1,
            });

            if (!keep) this.freeWriteBuffers.push(p.page);
            return keep;
        });

        let activePage = this.writePages[this.writePages.length - 1];

        if (!activePage || activePage.bytesWritten === this.writePageSize) {
            activePage = {
                startAddress: this.fileSize,
                bytesWritten: 0,
                page:
                    this.freeWriteBuffers.pop() ??
                    Buffer.alloc(this.writePageSize),
            };
            this.writePages.push(activePage);
        }

        const spaceAvailable = activePage.page.length - activePage.bytesWritten;

        if (spaceAvailable >= data.length) {
            activePage.page.set(data, activePage.bytesWritten);

            activePage.bytesWritten += data.length;
            this.fileSize += data.length;

            if (activePage.bytesWritten === activePage.page.length) {
                this.writeActivePage(onComplete);
            } else {
                onComplete?.();
            }
        } else {
            const firstChunk = data.subarray(0, spaceAvailable);
            const secondChunk = data.subarray(spaceAvailable);
            this.fileSize += firstChunk.length;

            activePage.page.set(firstChunk, activePage.bytesWritten);
            activePage.bytesWritten += firstChunk.length;

            this.writeActivePage();
            this.updateCacheWrite(secondChunk, onComplete);
        }
    }

    private async executeFileOperation() {
        if (this.fileOperationTasks.length === 0 || this.fileBusy) return;

        const nextTask = this.fileOperationTasks[0];
        this.fileOperationTasks.splice(0, 1);

        this.fileBusy = true;
        try {
            await nextTask();
        } catch {
            // do nothing
        }

        this.fileBusy = false;
        this.executeFileOperation();
    }

    append(data: Uint8Array) {
        return new Promise<void>(resolve => {
            this.updateCacheWrite(data, resolve);
        });
    }

    private readRange = (
        buffer: Uint8Array,
        bytesToRead: number,
        fileOffset: number,
        beforeRun?: () => void,
        abortController?: AbortController
    ) =>
        new Promise<number>(res => {
            this.fileOperationTasks.push(
                () =>
                    new Promise<void>((resolve, reject) => {
                        if (abortController?.signal.aborted) {
                            reject();
                            return;
                        }

                        beforeRun?.();

                        fs.read(
                            this.fileHandle,
                            buffer,
                            0,
                            bytesToRead,
                            fileOffset,
                            (_, bytesRead) => {
                                resolve();
                                res(bytesRead);
                            }
                        );
                    })
            );
            this.executeFileOperation();
        });

    private bufferPage = (
        page: Page,
        startAddress: number,
        beforeRun?: () => void
    ) => {
        const cancelOperation = new AbortController();

        const bufferingRequest = this.readRange(
            page.page,
            page.page.length,
            startAddress,
            beforeRun,
            cancelOperation
        ).then(bytesRead => {
            page.bytesWritten = bytesRead;
            page.startAddress = startAddress;
            this.cancelBufferOperations.delete(bufferingRequest);
        });

        cancelOperation.signal.addEventListener('abort', () => {
            this.cancelBufferOperations.delete(bufferingRequest);

            const index = this.bufferingRequests.findIndex(
                r => bufferingRequest === r
            );

            if (index !== -1) {
                this.bufferingRequests.splice(index, 1);
            }
        });

        this.cancelBufferOperations.set(bufferingRequest, cancelOperation);
        this.bufferingRequests.push(bufferingRequest);

        this.bufferingListeners.forEach(cb => {
            cb(bufferingRequest);
        });

        bufferingRequest.finally(() => {
            const index = this.bufferingRequests.findIndex(
                r => bufferingRequest === r
            );

            if (index !== -1) {
                this.bufferingRequests.splice(index, 1);
            }
        });

        return bufferingRequest;
    };

    private updateReadPages(
        beforeOffset: number,
        afterOffset: number,
        bias?: 'start' | 'end'
    ) {
        const writeBufferRange: Range = {
            start: Math.min(...this.writePages.map(p => p.startAddress)),
            end: Math.max(
                ...this.writePages.map(p => p.startAddress + p.bytesWritten - 1)
            ),
        };

        const normalizedBeforeOffset =
            Math.floor(beforeOffset / this.readPageSize) * this.readPageSize;
        const normalizedAfterOffset =
            Math.ceil(afterOffset / this.readPageSize) * this.readPageSize - 1;
        let idealBufferRange: Range = {
            start: Math.max(
                0,
                normalizedBeforeOffset -
                    Math.ceil(this.numberOfReadPages / 2) * this.readPageSize
            ),
            end: Math.min(
                this.fileSize - 1,
                normalizedAfterOffset +
                    Math.ceil(this.numberOfReadPages / 2) * this.readPageSize
            ),
        };

        if (bias === 'start') {
            idealBufferRange = {
                start: Math.max(
                    0,
                    normalizedBeforeOffset -
                        this.numberOfReadPages * this.readPageSize
                ),
                end: Math.min(this.fileSize - 1, normalizedAfterOffset),
            };
        }

        if (bias === 'end') {
            idealBufferRange = {
                start: Math.max(0, normalizedBeforeOffset),
                end: Math.min(
                    this.fileSize - 1,
                    normalizedAfterOffset +
                        this.numberOfReadPages * this.readPageSize
                ),
            };
        }

        if (idealBufferRange.start >= writeBufferRange.start) {
            return;
        }

        this.readPages = this.readPages.filter(p => {
            const keep = overlaps(idealBufferRange, {
                start: p.startAddress,
                end: p.startAddress + p.bytesWritten - 1,
            });

            if (!keep && p.page.length === this.readPageSize) {
                this.freeReadBuffers.push(p.page);
            }

            return keep;
        });

        for (
            let i = idealBufferRange.start;
            i < idealBufferRange.end;
            i += this.readPageSize
        ) {
            const missing =
                this.getAllPages().findIndex(p =>
                    fullOverlap(
                        {
                            start: p.startAddress,
                            end: p.startAddress + p.bytesWritten - 1,
                        },
                        {
                            start: i,
                            end: i + this.readPageSize - 1,
                        }
                    )
                ) === -1;

            if (missing) {
                const newReadPage = defaultPage();
                newReadPage.page =
                    this.freeReadBuffers.pop() ??
                    Buffer.alloc(this.readPageSize);
                this.bufferPage(newReadPage, i, () => {})
                    .then(() => {
                        this.readPages.push(newReadPage);
                    })
                    .catch(() => {
                        this.freeReadBuffers.push(newReadPage.page);
                    });
            }
        }
    }

    private isRequiredDataAllCached(
        byteOffset: number,
        numberOfBytesToRead: number
    ) {
        const pageHit = this.getAllPages().filter(p =>
            overlaps(
                {
                    start: p.startAddress,
                    end: p.startAddress + p.bytesWritten - 1,
                },
                {
                    start: byteOffset,
                    end: byteOffset + numberOfBytesToRead - 1,
                }
            )
        );

        const completedRanges: { start: number; end: number }[] = [];

        if (pageHit.length > 0) {
            pageHit.forEach(page => {
                const startOffset = Math.max(page.startAddress, byteOffset);
                const endOffset = Math.min(
                    page.startAddress + page.bytesWritten - 1,
                    byteOffset + numberOfBytesToRead - 1
                );
                completedRanges.push({
                    start: startOffset,
                    end: endOffset,
                });
            });

            const mergedRange = mergeRanges([...completedRanges]);

            return (
                mergedRange.length === 1 &&
                fullOverlap(mergedRange[0], {
                    start: byteOffset,
                    end: byteOffset + numberOfBytesToRead - 1,
                })
            );
        }

        return false;
    }

    private readFromCachedData(
        buffer: Buffer,
        byteOffset: number,
        numberOfBytesToRead: number,
        bias?: 'start' | 'end'
    ) {
        if (!this.isRequiredDataAllCached(byteOffset, numberOfBytesToRead)) {
            throw new Error('Data was not cached. Cannot use this method');
        }
        const pageHit = this.getAllPages().filter(p =>
            overlaps(
                {
                    start: p.startAddress,
                    end: p.startAddress + p.bytesWritten - 1,
                },
                {
                    start: byteOffset,
                    end: byteOffset + numberOfBytesToRead - 1,
                }
            )
        );

        if (pageHit.length > 0) {
            pageHit.forEach(page => {
                const startOffset = Math.max(page.startAddress, byteOffset);
                const endOffset = Math.min(
                    page.startAddress + page.bytesWritten - 1,
                    byteOffset + numberOfBytesToRead - 1
                );

                const subResult = page.page.subarray(
                    startOffset - page.startAddress,
                    endOffset - page.startAddress + 1
                );

                buffer.set(subResult, startOffset - byteOffset);
            });

            Promise.all(this.bufferingRequests).then(() =>
                this.updateReadPages(
                    byteOffset,
                    byteOffset + numberOfBytesToRead,
                    bias
                )
            );

            return numberOfBytesToRead;
        }

        throw new Error('Error loading data from cache');
    }

    async read(
        buffer: Buffer,
        byteOffset: number,
        numberOfBytesToRead: number,
        bias?: 'start' | 'end',
        onLoading?: (loading: boolean) => void
    ) {
        if (buffer.length < numberOfBytesToRead) {
            throw new Error('Buffer is too small');
        }

        if (byteOffset >= this.fileSize) {
            return 0;
        }

        try {
            return this.readFromCachedData(
                buffer,
                byteOffset,
                numberOfBytesToRead,
                bias
            );
        } catch {
            // cache miss we need to read
        }

        onLoading?.(true);

        this.bufferingRequests.forEach(op => {
            this.cancelBufferOperations.get(op)?.abort();
        });

        const bytesRead = await this.readRange(
            buffer,
            numberOfBytesToRead,
            byteOffset
        );

        const normalizedBegin =
            Math.ceil(byteOffset / this.readPageSize) * this.readPageSize;
        const normalizedEnd =
            Math.floor((byteOffset + bytesRead) / this.readPageSize) *
                this.readPageSize -
            1;

        if (normalizedEnd + 1 - normalizedBegin >= this.readPageSize) {
            const newPage = {
                page: buffer.subarray(
                    normalizedBegin - byteOffset,
                    normalizedEnd + 1 - byteOffset
                ),
                startAddress: normalizedBegin,
                bytesWritten: normalizedEnd - normalizedBegin + 1,
            };
            this.readPages.push(newPage);
        }

        Promise.all(this.bufferingRequests).then(() =>
            this.updateReadPages(
                byteOffset,
                byteOffset + numberOfBytesToRead,
                bias
            )
        );

        onLoading?.(false);
        if (bytesRead === numberOfBytesToRead) {
            return numberOfBytesToRead;
        }
        return bytesRead;
    }

    async flush() {
        if (this.fileHandle) {
            await this.writeActivePage();
            fs.fdatasyncSync(this.fileHandle);
        }
    }

    async close() {
        if (this.fileHandle) {
            await this.flush();
            fs.closeSync(this.fileHandle);
        }
    }

    release() {
        window.removeEventListener('beforeunload', this.beforeUnload);
        if (fs.existsSync(this.filePath)) {
            const dir = path.parse(this.filePath).dir;
            logger.info(`Deleting temporary ppk session at ${dir}`);
            fs.unlinkSync(this.filePath);
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    getSessionFolder() {
        return path.parse(this.filePath).dir;
    }

    onBuffering(listener: (bufferEvent: Promise<void>) => void) {
        this.bufferingListeners.push(listener);

        // report existing buffering events
        this.bufferingRequests.forEach(listener);

        return () => {
            const index = this.bufferingListeners.findIndex(
                l => l === listener
            );

            if (index !== -1) {
                this.bufferingListeners.splice(index, 1);
            }
        };
    }
}
