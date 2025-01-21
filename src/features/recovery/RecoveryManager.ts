/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import {
    FileData,
    frameSize,
    getSamplingTime,
    GlobalOptions,
} from '../../globals';
import { FileBuffer } from '../../utils/FileBuffer';
import { FoldingBuffer } from '../../utils/foldingBuffer';
import {
    ReadSessions,
    Session,
    WriteSessions,
} from './SessionsListFileHandler';

const pageSize = 10 * 100_000 * frameSize; // 6 bytes per sample for and 10sec buffers at highest sampling rate
const initialSamplingTime = 10;
const initialSamplesPerSecond = 1e6 / initialSamplingTime;
const currentProcessName = process.argv[0].split(path.sep)[
    process.argv[0].split(path.sep).length - 1
];

const stat = promisify(fs.stat);

const options: GlobalOptions = {
    samplesPerSecond: initialSamplesPerSecond,
    timeReachedTriggers: [],
    inSyncOffset: 0,
    lastInSyncTime: 0,
};

function getSamplingDurationInSec(filePath: string) {
    const stats = fs.statSync(filePath);
    const startTime = stats.birthtimeMs;
    const endTime = stats.mtimeMs;

    return Math.floor((endTime - startTime) / 1000);
}

async function finalizeRecovery(
    sessionPath: string,
    samplesPerSecond: number,
    startTime: number
) {
    try {
        await options.foldingBuffer?.saveToFile(sessionPath);
        await saveMetadataToFile(sessionPath, samplesPerSecond, startTime);
    } catch (error) {
        throw new Error(`Error finalizing recovery: ${error}`);
    }
}

async function saveMetadataToFile(
    sessionPath: string,
    samplesPerSecond: number,
    startSystemTime: number
) {
    const metadata = {
        metadata: {
            samplesPerSecond,
            startSystemTime,
        },
        formatVersion: 2,
    };

    const metadataPath = path.join(sessionPath, 'metadata.json');
    try {
        await fs.promises.writeFile(
            metadataPath,
            JSON.stringify(metadata, null, 2)
        );
    } catch (error) {
        throw new Error(`Error saving metadata: ${error}`);
    }
}

function processBuffer(buffer: Buffer, bytesRead: number, records: number) {
    const fileData = new FileData(buffer, bytesRead);

    for (let i = 0; i < fileData.getLength(); i += 1) {
        const measuredValue = fileData.getCurrentData(i);
        const measuredTime =
            records * getSamplingTime(options.samplesPerSecond);
        options.foldingBuffer?.addData(measuredValue, measuredTime);

        records += 1;
    }

    return records;
}

function getProcessInfo(processId: number) {
    const platform = process.platform;
    let command: string;

    if (platform === 'win32') {
        command = `wmic process where ProcessId=${processId} get name,processid`;
    } else if (platform === 'linux' || platform === 'darwin') {
        // Use `ps` to get process details on Linux/macOS
        command = `ps -p ${processId} -o comm=`;
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    exec(command, (error, stdout, stderr) => {
        if (stderr) {
            // console.error(`Error fetching process details: ${stderr}`);
            return null;
        }

        if (error) {
            // TODO: Should we consider the session as orphaned as the error is raised by the command itself, but not the process?
            return null;
        }

        const lines = stdout.trim().split('\n');

        if (lines.length >= 1) {
            // For Windows, split process details; for Linux/macOS, return process name directly
            if (platform === 'win32') {
                const [processName, pid] = lines[1]?.trim().split(/\s+/) || [];
                return { processName, pid };
            }

            return {
                processName: lines[0].trim(),
                pid: processId.toString(),
            };
        }
    });

    return null;
}

export const RecoveryManager = () => ({
    async recoverSession(
        session: Session,
        onProgress: (progress: number) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ) {
        const sessionFilePath = session.filePath;
        const sessionPath = path.dirname(sessionFilePath);

        const stats = await stat(sessionFilePath);

        const fileSize = stats.size;

        options.samplesPerSecond = session.samplingRate;

        options.fileBuffer = new FileBuffer(
            pageSize,
            sessionPath,
            2,
            30,
            session.startTime,
            false
        );

        options.foldingBuffer = new FoldingBuffer();

        const buffer = Buffer.alloc(pageSize);
        let offset = 0;
        let recordCount = 0;

        const processChunk = async () => {
            try {
                if (offset >= fileSize) {
                    await finalizeRecovery(
                        sessionPath,
                        options.samplesPerSecond,
                        session.startTime
                    );
                    onComplete();
                    return;
                }

                const remainingBytes = fileSize - offset;
                const bytesToRead = Math.min(pageSize, remainingBytes);

                options.fileBuffer
                    ?.read(buffer, offset, bytesToRead)
                    .then(() => {
                        offset += bytesToRead;

                        recordCount = processBuffer(
                            buffer,
                            bytesToRead,
                            recordCount
                        );

                        const progress = (offset / fileSize) * 100;
                        onProgress(progress);

                        queueMicrotask(processChunk);
                    });
            } catch (error) {
                onError(new Error(`Error recovering session: ${error}`));
            }
        };

        queueMicrotask(processChunk);
    },
    async searchOrphanedSessions(
        onProgress: (progress: number) => void,
        onComplete: (orphanedSessions: Session[]) => void,
        findOnlyOne = false
    ) {
        const orphanedSessions: Session[] = [];
        const sessions = await ReadSessions();
        let nonExistingFile = false;

        const checkSession = (index: number) => {
            if (
                index >= sessions.length ||
                (findOnlyOne && orphanedSessions.length === 1)
            ) {
                if (nonExistingFile) {
                    WriteSessions(sessions);
                }
                onComplete(orphanedSessions);
                return;
            }

            const session = sessions[index];

            if (!fs.existsSync(session.filePath)) {
                nonExistingFile = true;
                sessions.splice(index, 1);
                setTimeout(() => checkSession(index), 0);
                return;
            }

            const processInfo = getProcessInfo(parseInt(session.pid, 10));

            session.samplingDuration = getSamplingDurationInSec(
                session.filePath
            );

            if (processInfo) {
                const { processName, pid } = processInfo;
                if (pid === session.pid && processName !== currentProcessName) {
                    orphanedSessions.push(session);
                }
            } else {
                orphanedSessions.push(session);
            }

            onProgress(((index + 1) / sessions.length) * 100);

            setTimeout(() => checkSession(index + 1), 0);
        };

        setTimeout(() => checkSession(0), 0);
    },
});
