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

    constructor(
        readPageSize: number,
        writePageSize: number,
        filePath: fs.PathLike
    ) {
        this.readPageSize = readPageSize;
        this.writePageSize = writePageSize;

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
            start: Math.max(0, 1 + normalizedEnd - 3 * this.writePageSize),
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

    private executeFileOperation() {
        if (this.fileOperationTasks.length === 0 || this.fileBusy) return;

        const nextTask = this.fileOperationTasks[0];
        this.fileOperationTasks.splice(0, 1);

        this.fileBusy = true;
        nextTask().finally(() => {
            this.fileBusy = false;
            this.executeFileOperation();
        });
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
        onComplete: (bytesRead: number) => void,
        beforeRun?: () => void
    ) => {
        this.fileOperationTasks.push(
            () =>
                new Promise<void>(res => {
                    beforeRun?.();
                    fs.read(
                        this.fileHandle,
                        buffer,
                        0,
                        bytesToRead,
                        fileOffset,
                        (_, bytesRead) => {
                            res();
                            onComplete(bytesRead);
                        }
                    );
                })
        );
        this.executeFileOperation();
    };

    private readPage = (
        page: Page,
        startAddress: number,
        beforeRun?: () => void
    ) =>
        new Promise<void>(release => {
            this.readRange(
                page.page,
                page.page.length,
                startAddress,
                bytesRead => {
                    page.bytesWritten = bytesRead;
                    page.startAddress = startAddress;
                    release();
                },
                beforeRun
            );
        });

    private updateReadPages(beforeOffset: number, afterOffset: number) {
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
        const idealBufferRange: Range = {
            start: Math.max(0, normalizedBeforeOffset - this.readPageSize),
            end: Math.min(
                this.fileSize - 1,
                normalizedAfterOffset + this.readPageSize
            ),
        };

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
                const buffering = this.readPage(newReadPage, i, () => {}).then(
                    () => {
                        this.readPages.push(newReadPage);
                    }
                );
                this.bufferingListeners.forEach(cb => {
                    cb(buffering);
                });
            }
        }
    }

    read(
        buffer: Buffer,
        byteOffset: number,
        numberOfBytesToRead: number,
        onLoading?: (loading: boolean) => void
    ) {
        if (buffer.length < numberOfBytesToRead) {
            throw new Error('Buffer is too small');
        }

        if (byteOffset >= this.fileSize) {
            return 0;
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

        const completedRanges: { start: number; end: number }[] = [];

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

                completedRanges.push({
                    start: startOffset,
                    end: endOffset,
                });

                buffer.set(subResult, startOffset - byteOffset);
            });

            const mergedRange = mergeRanges([...completedRanges]);

            const allDone =
                mergedRange.length === 1 &&
                fullOverlap(mergedRange[0], {
                    start: byteOffset,
                    end: byteOffset + numberOfBytesToRead - 1,
                });

            if (allDone) {
                this.updateReadPages(
                    byteOffset,
                    byteOffset + numberOfBytesToRead
                );
                return numberOfBytesToRead;
            }
        }

        onLoading?.(true);
        return new Promise<number>(resolve => {
            this.readRange(
                buffer,
                numberOfBytesToRead,
                byteOffset,
                bytesRead => {
                    const normalizedBegin =
                        Math.ceil(byteOffset / this.readPageSize) *
                        this.readPageSize;
                    const normalizedEnd =
                        Math.floor(
                            (byteOffset + bytesRead) / this.readPageSize
                        ) *
                            this.readPageSize -
                        1;

                    if (
                        normalizedEnd - normalizedBegin + 1 >=
                        this.readPageSize
                    ) {
                        const newPage = {
                            page: buffer.subarray(
                                normalizedBegin,
                                normalizedEnd
                            ),
                            startAddress: normalizedBegin,
                            bytesWritten: normalizedEnd - normalizedBegin + 1,
                        };
                        this.readPages.push(newPage);
                    }

                    this.updateReadPages(
                        byteOffset,
                        byteOffset + numberOfBytesToRead - 1
                    );

                    onLoading?.(false);
                    if (bytesRead === numberOfBytesToRead) {
                        resolve(numberOfBytesToRead);
                    } else {
                        resolve(bytesRead);
                    }
                }
            );
        });
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
