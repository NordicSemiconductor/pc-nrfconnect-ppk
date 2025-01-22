/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { FileData, frameSize, getSamplingTime } from '../../globals';
import { FileBuffer } from '../../utils/FileBuffer';
import { FoldingBuffer } from '../../utils/foldingBuffer';
import {
    ReadSessions,
    Session,
    WriteSessions,
} from './SessionsListFileHandler';

export class RecoveryManager {
    static #instance: RecoveryManager;
    #pageSize: number;
    #initialSamplingTime: number;
    #initialSamplesPerSecond: number;
    #currentProcessName: string;
    #samplesPerSecond: number;
    #foldingBuffer: FoldingBuffer | null;
    #fileBuffer: FileBuffer | null;
    #cancelRecovery: boolean;

    constructor() {
        this.#pageSize = 10 * 100_000 * frameSize; // 6 bytes per sample for and 10sec buffers at highest sampling rate
        this.#initialSamplingTime = 10;
        this.#initialSamplesPerSecond = 1e6 / this.#initialSamplingTime;
        this.#samplesPerSecond = this.#initialSamplesPerSecond;
        this.#currentProcessName = process.argv[0].split(path.sep)[
            process.argv[0].split(path.sep).length - 1
        ];
        this.#foldingBuffer = null;
        this.#fileBuffer = null;
        this.#cancelRecovery = false;
    }

    static getInstance(): RecoveryManager {
        if (!RecoveryManager.#instance) {
            RecoveryManager.#instance = new RecoveryManager();
        }

        return RecoveryManager.#instance;
    }

    cancelRecoveryProcess() {
        this.#cancelRecovery = true;
    }

    static #getSamplingDurationInSec(filePath: string) {
        const stats = fs.statSync(filePath);
        const startTime = stats.birthtimeMs;
        const endTime = stats.mtimeMs;

        return Math.floor((endTime - startTime) / 1000);
    }

    async #finalizeRecovery(
        sessionPath: string,
        samplesPerSecond: number,
        startTime: number
    ) {
        try {
            await this.#foldingBuffer?.saveToFile(sessionPath);
            await RecoveryManager.#saveMetadataToFile(
                sessionPath,
                samplesPerSecond,
                startTime
            );
        } catch (error) {
            throw new Error(`Error finalizing recovery: ${error}`);
        }
    }

    static async #saveMetadataToFile(
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

    #processBuffer(buffer: Buffer, bytesRead: number, records: number) {
        const fileData = new FileData(buffer, bytesRead);

        for (let i = 0; i < fileData.getLength(); i += 1) {
            const measuredValue = fileData.getCurrentData(i);
            const measuredTime =
                records * getSamplingTime(this.#samplesPerSecond);
            this.#foldingBuffer?.addData(measuredValue, measuredTime);

            records += 1;
        }

        return records;
    }

    static getProcessInfo(processId: number) {
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
                    const [processName, pid] =
                        lines[1]?.trim().split(/\s+/) || [];
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

    async recoverSession(
        session: Session,
        onProgress: (progress: number) => void,
        onComplete: () => void,
        onFail: (error: Error) => void,
        onCancel: () => void
    ) {
        this.#cancelRecovery = false;
        const stat = promisify(fs.stat);

        const sessionFilePath = session.filePath;
        const sessionPath = path.dirname(sessionFilePath);

        const stats = await stat(sessionFilePath);

        const fileSize = stats.size;

        this.#samplesPerSecond = session.samplingRate;

        this.#fileBuffer = new FileBuffer(
            this.#pageSize,
            sessionPath,
            2,
            30,
            session.startTime,
            false
        );

        this.#foldingBuffer = new FoldingBuffer();

        const buffer = Buffer.alloc(this.#pageSize);
        let offset = 0;
        let recordCount = 0;

        const processChunk = async () => {
            try {
                if (this.#cancelRecovery) {
                    this.#cancelRecovery = false;
                    this.#fileBuffer?.close();
                    this.#fileBuffer = null;
                    this.#foldingBuffer = null;
                    onCancel();
                    return;
                }

                if (offset >= fileSize) {
                    await this.#finalizeRecovery(
                        sessionPath,
                        this.#samplesPerSecond,
                        session.startTime
                    );
                    onComplete();
                    return;
                }

                const remainingBytes = fileSize - offset;
                const bytesToRead = Math.min(this.#pageSize, remainingBytes);

                this.#fileBuffer?.read(buffer, offset, bytesToRead).then(() => {
                    offset += bytesToRead;

                    recordCount = this.#processBuffer(
                        buffer,
                        bytesToRead,
                        recordCount
                    );

                    const progress = (offset / fileSize) * 100;
                    onProgress(progress);

                    queueMicrotask(processChunk);
                });
            } catch (error) {
                if (error instanceof Error) {
                    onFail(
                        new Error(`Error recovering session: ${error.message}`)
                    );
                    return;
                }

                onFail(new Error('Error recovering session: Unknown error'));
            }
        };

        queueMicrotask(processChunk);
    }

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

            const processInfo = RecoveryManager.getProcessInfo(
                parseInt(session.pid, 10)
            );

            session.samplingDuration =
                RecoveryManager.#getSamplingDurationInSec(session.filePath);

            if (processInfo) {
                const { processName, pid } = processInfo;
                if (
                    pid === session.pid &&
                    processName !== this.#currentProcessName
                ) {
                    orphanedSessions.push(session);
                }
            } else {
                orphanedSessions.push(session);
            }

            onProgress(((index + 1) / sessions.length) * 100);

            setTimeout(() => checkSession(index + 1), 0);
        };

        setTimeout(() => checkSession(0), 0);
    }
}
