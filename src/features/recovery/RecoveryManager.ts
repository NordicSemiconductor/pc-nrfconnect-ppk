/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    AppThunk,
    setCurrentPane,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import logger from '@nordicsemiconductor/pc-nrfconnect-shared/src/logging';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import {
    DataManager,
    FileData,
    frameSize,
    getSamplingTime,
} from '../../globals';
import { RootState } from '../../slices';
import { setSessionRecoveryPending } from '../../slices/appSlice';
import {
    chartWindowAction,
    getWindowDuration,
    resetChartTime,
    resetCursor,
    scrollToEnd,
    setLatestDataTimestamp,
    setLiveMode,
    triggerForceRerender as triggerForceRerenderMainChart,
} from '../../slices/chartSlice';
import { updateSampleFreqLog10 } from '../../slices/dataLoggerSlice';
import { FileBuffer } from '../../utils/FileBuffer';
import { FoldingBuffer } from '../../utils/foldingBuffer';
import { Panes } from '../../utils/panes';
import {
    miniMapAnimationAction,
    resetMinimap,
    triggerForceRerender as triggerForceRerenderMiniMap,
} from '../minimap/minimapSlice';
import {
    ChangeSessionStatus,
    ReadSessions,
    RemoveSessionByFilePath,
    Session,
    SessionFlag,
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

    static #getSamplingDurationInSec(session: Session) {
        const stats = fs.statSync(session.filePath);
        return Math.round(stats.size / (session.samplingRate * frameSize));
    }

    static renderSessionData =
        (
            session: Session,
            onComplete?: () => void,
            onFail?: (error: Error) => void
        ): AppThunk<RootState, Promise<void>> =>
        async (dispatch, getState) => {
            try {
                const sessionPath = path.dirname(session.filePath);

                await DataManager().reset();
                dispatch(resetChartTime());
                dispatch(resetMinimap());
                dispatch(setLiveMode(false));
                dispatch(resetCursor());

                await DataManager().setSamplesPerSecond(session.samplingRate);
                await DataManager().loadData(sessionPath, session.startTime);

                const timestamp = DataManager().getTimestamp();

                dispatch(setCurrentPane(Panes.DATA_LOGGER));

                if (timestamp) {
                    dispatch(setLatestDataTimestamp(timestamp));
                    dispatch(
                        updateSampleFreqLog10({
                            sampleFreqLog10: Math.log10(
                                DataManager().getSamplesPerSecond()
                            ),
                        })
                    );
                    if (
                        DataManager().getTimestamp() <=
                        getWindowDuration(getState())
                    ) {
                        dispatch(
                            chartWindowAction(0, DataManager().getTimestamp())
                        );
                    } else {
                        dispatch(scrollToEnd());
                    }
                    dispatch(triggerForceRerenderMainChart());
                    dispatch(triggerForceRerenderMiniMap());
                    dispatch(miniMapAnimationAction());
                }
                onComplete?.();
            } catch (error) {
                if (error instanceof Error) {
                    onFail?.(
                        new Error(
                            `Failed to render the session: ${error.message}`
                        )
                    );
                } else {
                    onFail?.(
                        new Error('Unknown error while rendering the session.')
                    );
                }
            }
        };

    #finalizeRecovery =
        (session: Session): AppThunk<RootState, Promise<void>> =>
        async dispatch => {
            try {
                const sessionPath = path.dirname(session.filePath);
                await this.#foldingBuffer?.saveToFile(sessionPath);
                await RecoveryManager.#saveMetadataToFile(
                    sessionPath,
                    session.samplingRate,
                    session.startTime
                );

                ChangeSessionStatus(session.filePath, SessionFlag.Recovered);

                await dispatch(RecoveryManager.renderSessionData(session));
            } catch (error) {
                throw new Error(`Error finalizing recovery: ${error}`);
            }
        };

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

    static getPIDs = (processName: string): Promise<number[]> =>
        new Promise((resolve, reject) => {
            const platform = process.platform;
            let command: string;

            if (platform === 'win32') {
                command = `tasklist | findstr "nRF electron"`;
            } else if (platform === 'linux') {
                command = `pgrep -f ${processName}`;
            } else if (platform === 'darwin') {
                command = `pgrep -f ${processName
                    .replace('(Renderer)', '')
                    .trim()}`;
            } else {
                reject(new Error(`Unsupported platform: ${platform}`));
                return;
            }

            exec(command, (error, stdout, stderr) => {
                if (stderr) {
                    return [];
                }

                if (error) {
                    logger.error(error);
                    return [];
                }

                const lines = stdout.trim().split('\n');
                const pids: number[] = [];

                if (lines.length > 0) {
                    if (process.platform === 'win32') {
                        lines.forEach(line => {
                            const parts = line.trim().split(/\s+/);

                            // The PID is typically the second element, but check for cases with extra spaces in the name
                            const pidIndex = parts.length - 5; // PID should be 5th from last
                            const pid = parseInt(parts[pidIndex], 10);

                            if (!Number.isNaN(pid)) {
                                pids.push(pid);
                            }
                        });
                    } else {
                        lines.forEach(line => {
                            const pid = parseInt(line.trim(), 10);
                            if (!Number.isNaN(pid)) {
                                pids.push(pid);
                            }
                        });
                    }
                }

                resolve(pids);
            });
        });

    #releaseBuffers() {
        this.#fileBuffer?.close();
        this.#fileBuffer = null;
        this.#foldingBuffer = null;
    }

    recoverSession =
        (
            session: Session,
            onProgress: (progress: number) => void,
            onComplete: () => void,
            onFail: (error: Error) => void,
            onCancel: () => void
        ): AppThunk<RootState, Promise<void>> =>
        async dispatch => {
            dispatch(setSessionRecoveryPending(true));
            this.#cancelRecovery = false;
            const stat = promisify(fs.stat);

            const sessionFilePath = session.filePath;
            const sessionPath = path.dirname(sessionFilePath);

            if (!fs.existsSync(sessionFilePath)) {
                dispatch(setSessionRecoveryPending(false));
                onFail(new Error(`Session file not found: ${sessionFilePath}`));
                return;
            }

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
                        this.#releaseBuffers();
                        dispatch(setSessionRecoveryPending(false));
                        onCancel();
                        return;
                    }

                    if (offset >= fileSize) {
                        try {
                            await dispatch(this.#finalizeRecovery(session));
                            this.#releaseBuffers();
                            dispatch(setSessionRecoveryPending(false));
                            onComplete();
                        } catch (finalizeError) {
                            if (finalizeError instanceof Error) {
                                onFail(finalizeError);
                            } else {
                                onFail(
                                    new Error(
                                        'Unknown error during finalize recovery.'
                                    )
                                );
                            }
                        }
                        return;
                    }

                    const remainingBytes = fileSize - offset;
                    const bytesToRead = Math.min(
                        this.#pageSize,
                        remainingBytes
                    );

                    this.#fileBuffer
                        ?.read(buffer, offset, bytesToRead)
                        .then(() => {
                            offset += bytesToRead;

                            recordCount = this.#processBuffer(
                                buffer,
                                bytesToRead,
                                recordCount
                            );

                            const progress = (offset / fileSize) * 100;
                            if (
                                Math.floor(progress) >
                                Math.floor(
                                    ((offset - bytesToRead) / fileSize) * 100
                                )
                            ) {
                                onProgress(Math.floor(progress));
                            }

                            setTimeout(() => processChunk(), 0);
                        });
                } catch (error) {
                    this.#releaseBuffers();
                    if (error instanceof Error) {
                        onFail(
                            new Error(
                                `Error recovering session: ${error.message}`
                            )
                        );
                        return;
                    }

                    onFail(
                        new Error('Error recovering session: Unknown error')
                    );
                }
            };

            onProgress(0);
            setTimeout(() => processChunk(), 0);
        };

    async searchOrphanedSessions(
        onProgress: (progress: number) => void,
        onComplete: (orphanedSessions: Session[]) => void
    ) {
        const orphanedSessions: Session[] = [];
        const sessions = await ReadSessions();
        let nonExistingFile = false;

        if (sessions.length === 0) {
            onComplete(orphanedSessions);
            return;
        }

        const processList: number[] = await RecoveryManager.getPIDs(
            this.#currentProcessName
        );

        const checkSession = (index: number) => {
            if (index >= sessions.length) {
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

            session.samplingDuration =
                RecoveryManager.#getSamplingDurationInSec(session);

            if (!processList.includes(Number(session.pid))) {
                if (session.flag === SessionFlag.PPK2Loaded) {
                    RemoveSessionByFilePath(session.filePath, () => {});
                } else {
                    orphanedSessions.push(session);
                }
            }

            onProgress(((index + 1) / sessions.length) * 100);

            setTimeout(() => checkSession(index + 1), 0);
        };

        setTimeout(() => checkSession(0), 0);
    }
}
