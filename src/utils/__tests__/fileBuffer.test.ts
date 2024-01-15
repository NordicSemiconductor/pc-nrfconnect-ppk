/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import fs from 'fs-extra';
import path from 'path';

import { FileBuffer } from '../FileBuffer';

jest.mock('fs-extra', () => ({
    openSync: jest.fn(() => 1),
    mkdirSync: jest.fn(() => {}),
    existsSync: jest.fn(() => false),
    rmSync: jest.fn(() => {}),
    unlinkSync: jest.fn(() => {}),
    appendFile: jest.fn(
        () =>
            new Promise<void>(resolve => {
                setTimeout(() => resolve());
            })
    ),
    read: jest.fn(
        (
            fd: number,
            buffer: Uint8Array,
            offset: number,
            length: number,
            position: fs.ReadPosition | null,
            callback: (
                err: NodeJS.ErrnoException | null,
                bytesRead: number,
                buffer: Uint8Array
            ) => void
        ) => {
            callback(null, length, buffer);
        }
    ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const castToJest = (fn: any) => fn as jest.Mock<any, any, any>;

const mockFsRead = (cb: (buffer: Uint8Array) => number) => {
    castToJest(fs.read).mockImplementationOnce(
        (
            fd: number,
            buffer: Uint8Array,
            offset: number,
            length: number,
            position: fs.ReadPosition | null,
            callback: (
                err: NodeJS.ErrnoException | null,
                bytesRead: number,
                buffer: Uint8Array
            ) => void
        ) => {
            const noOfBytesRead = cb(buffer);
            callback(null, noOfBytesRead, buffer);
        }
    );
};

describe('WriteBuffer', () => {
    const readPageSize = 10;
    const writePageSize = 10;
    const sessionFolder = path.join('session', 'folder');
    let fileBuffer = new FileBuffer(readPageSize, writePageSize, sessionFolder);
    beforeEach(() => {
        // we reset virtual filesystem before each test
        jest.clearAllMocks();
        fileBuffer = new FileBuffer(readPageSize, writePageSize, sessionFolder);
    });

    test('creates new folder for the session', () => {
        expect(fs.mkdirSync).toBeCalledTimes(1);
        expect(fs.mkdirSync).toBeCalledWith(sessionFolder);
    });

    test('creates new session .raw file', () => {
        expect(fs.openSync).toBeCalledTimes(1);
        expect(fs.openSync).toBeCalledWith(
            path.join(sessionFolder, 'session.raw'),
            'as+'
        );
    });

    test('clear session folder', () => {
        castToJest(fs.existsSync).mockImplementationOnce(() => true);
        fileBuffer.release();
        expect(fs.rmSync).toBeCalledTimes(1);
        expect(fs.rmSync).toBeCalledWith(
            path.join('session/folder'),
            expect.anything()
        );
    });

    test('Save write buffer to file when buffer is erectly full', async () => {
        await fileBuffer.append(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));

        expect(fs.appendFile).toBeCalledTimes(1);
        expect(fs.appendFile).toBeCalledWith(
            1,
            Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        );
    });

    test('No data is written if write buffer is not full', async () => {
        await fileBuffer.append(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8]));

        expect(fs.appendFile).toBeCalledTimes(0);
    });

    test('Save write buffer to file when buffer is full and only write the page size', async () => {
        await fileBuffer.append(
            Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        );

        expect(fs.appendFile).toBeCalledTimes(1);
        expect(fs.appendFile).toBeCalledWith(
            1,
            Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
        );
    });

    test('Flush write current buffer to file and move to a new page', async () => {
        await fileBuffer.append(Buffer.from([0, 1, 2, 3, 4, 5]));
        await fileBuffer.flush();
        await fileBuffer.append(
            Buffer.from([6, 7, 6, 9, 10, 11, 12, 13, 14, 15])
        );

        expect(fs.appendFile).toBeCalledTimes(2);
        expect(fs.appendFile).nthCalledWith(
            1,
            1,
            Buffer.from([0, 1, 2, 3, 4, 5])
        );
        expect(fs.appendFile).nthCalledWith(
            2,
            1,
            Buffer.from([6, 7, 6, 9, 10, 11, 12, 13, 14, 15])
        );
    });

    test('Reading empty buffer will not return nothing', async () => {
        const result = await fileBuffer.read(0, 10);

        expect(fs.read).toBeCalledTimes(0);
        expect(result.length).toEqual(0);
    });

    test('Reading beyond the buffer size returns nothing', async () => {
        await fileBuffer.append(Buffer.from([0, 1, 2, 3, 4]));
        const result = await fileBuffer.read(5, 1);

        expect(fs.read).toBeCalledTimes(0);
        expect(result.length).toEqual(0);
    });

    test('Reading return the expected bytes from active writePage', async () => {
        await fileBuffer.append(Buffer.from([0, 1, 2, 3, 4]));
        const result = await fileBuffer.read(2, 3);

        expect(fs.read).toBeCalledTimes(0);
        expect(result).toStrictEqual(Buffer.from([2, 3, 4]));
    });

    test('Reading over two write buffers return the expected bytes from the writePage', async () => {
        await fileBuffer.append(
            Buffer.from([
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                18, 19,
            ])
        );
        const result = await fileBuffer.read(9, 2);

        expect(fs.read).toBeCalledTimes(0);
        expect(result).toStrictEqual(Buffer.from([9, 10]));
    });

    test('Reading over all three write buffers return the expected bytes from the writePage', async () => {
        await fileBuffer.append(
            Buffer.from([
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 38, 29,
            ])
        );
        const result = await fileBuffer.read(9, 12);

        expect(fs.read).toBeCalledTimes(0);
        expect(result).toStrictEqual(
            Buffer.from([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
        );
    });

    test('Reading live data', async () => {
        await fileBuffer.append(
            Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
        );
        const result = await fileBuffer.read(10, 5);

        expect(fs.read).toBeCalledTimes(0);
        expect(result).toStrictEqual(Buffer.from([10, 11, 12, 13, 14]));
    });
});

describe('ReadBuffers', () => {
    const readPageSize = 2;
    const writePageSize = 1;
    const sessionFolder = path.join('session', 'folder');
    let fileBuffer = new FileBuffer(readPageSize, writePageSize, sessionFolder);
    beforeEach(async () => {
        // we reset virtual filesystem before each test
        jest.clearAllMocks();
        fileBuffer = new FileBuffer(readPageSize, writePageSize, sessionFolder);
        await fileBuffer.append(Buffer.from([0, 1, 2])); // fill write buffers
    });

    test('Reading over all three write buffers return the expected bytes from the writePage', async () => {
        const result = await fileBuffer.read(0, 3);

        expect(fs.read).toBeCalledTimes(0);
        expect(result).toStrictEqual(Buffer.from([0, 1, 2]));
    });

    test('Reading over all three write buffers return the expected bytes from the writePage after write page cleared', async () => {
        await fileBuffer.append(Buffer.from([3])); // write buffer will now loose the first byte
        const result = await fileBuffer.read(1, 3);

        expect(fs.read).toBeCalledTimes(0);
        expect(result).toStrictEqual(Buffer.from([1, 2, 3]));
    });

    test('Reading over all three write buffers and one miss forcing read from file', async () => {
        await fileBuffer.append(Buffer.from([3])); // write buffer will now loose the first byte

        mockFsRead(buffer => {
            buffer.set(Buffer.from([0, 1, 2, 3]));
            return 4;
        });
        const result = await fileBuffer.read(0, 4);

        expect(fs.read).toBeCalledTimes(1);
        expect(result).toStrictEqual(Buffer.from([0, 1, 2, 3]));
    });

    test('Buffering read exact page size reads', async () => {
        const bufferingEvents: Promise<void>[] = [];

        fileBuffer.onBuffering(buffering => {
            bufferingEvents.push(buffering);
        });

        await fileBuffer.append(
            Buffer.from([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
        ); // write buffer will now loose the first byte

        await fileBuffer.read(6, 2);
        expect(bufferingEvents.length).toBe(2);
        await Promise.all(bufferingEvents);
        expect(fs.read).toBeCalledTimes(3);
        expect(fs.read).nthCalledWith(
            1,
            1, // file handle
            expect.anything(),
            0,
            readPageSize,
            6,
            expect.anything()
        ); // Data we want to read
        expect(fs.read).nthCalledWith(
            2,
            1, // file handle
            expect.anything(),
            0,
            readPageSize,
            4,
            expect.anything()
        ); // Page Before
        expect(fs.read).nthCalledWith(
            3,
            1, // file handle
            expect.anything(),
            0,
            readPageSize,
            8,
            expect.anything()
        ); // Page After
    });

    test('Buffering read non exact page size reads', async () => {
        const bufferingEvents: Promise<void>[] = [];

        fileBuffer.onBuffering(buffering => {
            bufferingEvents.push(buffering);
        });

        await fileBuffer.append(
            Buffer.from([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
        ); // write buffer will no longer covert the first few bytes

        await fileBuffer.read(5, 4);
        expect(bufferingEvents.length).toBe(2);
        await Promise.all(bufferingEvents);
        expect(fs.read).toBeCalledTimes(3);
        expect(fs.read).nthCalledWith(
            1,
            1, // file handle
            expect.anything(),
            0,
            4,
            5,
            expect.anything()
        ); // Data we want to read
        expect(fs.read).nthCalledWith(
            2,
            1, // file handle
            expect.anything(),
            0,
            readPageSize,
            4,
            expect.anything()
        ); // Page Before
        expect(fs.read).nthCalledWith(
            3,
            1, // file handle
            expect.anything(),
            0,
            readPageSize,
            8,
            expect.anything()
        ); // Page After
    });

    test('Buffer right after read cache hit', async () => {
        const bufferingEvents: Promise<void>[] = [];

        fileBuffer.onBuffering(buffering => {
            bufferingEvents.push(buffering);
        });

        await fileBuffer.append(
            Buffer.from([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
        ); // write buffer will no longer covert the first few bytes

        await fileBuffer.read(6, 2); // read and buffer from 4-9
        expect(bufferingEvents.length).toBe(2);
        await Promise.all(bufferingEvents);
        expect(fs.read).toBeCalledTimes(3);
        await fileBuffer.read(8, 2); // read and buffer from 4-9
        expect(fs.read).toBeCalledTimes(4); // read one buffer to the right
        expect(fs.read).nthCalledWith(
            4,
            1, // file handle
            expect.anything(),
            0,
            2,
            10,
            expect.anything()
        ); // Buffer right
    });
});
