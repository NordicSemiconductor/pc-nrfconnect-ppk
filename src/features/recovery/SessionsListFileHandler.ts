/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { getAppDataDir } from '@nordicsemiconductor/pc-nrfconnect-shared';
import fs from 'fs';
import path from 'path';

const appDataFolder = getAppDataDir();
const sessionsListFilePath = path.join(appDataFolder, 'sessions.ppksess');
const lineFormatRegex = /^\d+\t\d+(\.\d+)?\t\d+\t.+$/;

export type Session = {
    pid: string;
    startTime: number;
    samplingRate: number;
    alreadyRecovered: boolean;
    filePath: string;
    samplingDuration?: number;
};

export const ReadSessions = async (): Promise<Session[]> => {
    if (!fs.existsSync(sessionsListFilePath)) {
        await fs.promises.writeFile(sessionsListFilePath, '');
        return [];
    }

    const sessionsList = await fs.promises.readFile(sessionsListFilePath, {
        encoding: 'utf8',
    });

    const lines = sessionsList.split(/\r?\n/);

    const validLines: Session[] = lines
        .filter(line => line.trim() !== '' && lineFormatRegex.test(line))
        .map(line => {
            const [pid, startTime, samplingRate, alreadyRecovered, filePath] =
                line.split('\t');
            return {
                pid,
                startTime: Number(startTime),
                samplingRate: Number(samplingRate),
                alreadyRecovered: alreadyRecovered === '1',
                filePath,
            };
        });

    return validLines;
};

export const WriteSessions = async (sessions: Session[]) => {
    const sessionsList = sessions
        .map(
            session =>
                `${session.pid}\t${session.startTime}\t${
                    session.samplingRate
                }\t${Number(session.alreadyRecovered)}\t${session.filePath}`
        )
        .join('\n');

    await fs.promises.writeFile(sessionsListFilePath, sessionsList);
};

export const AddSession = async (
    startTime: number,
    samplingRate: number,
    alreadyRecovered: boolean,
    filePath: string
) => {
    const session: Session = {
        pid: process.pid.toString(),
        startTime,
        samplingRate,
        alreadyRecovered,
        filePath,
    };

    const sessions = await ReadSessions();
    sessions.unshift(session);
    await WriteSessions(sessions);
};

export const RemoveSessionByFilePath = async (
    filePath: string,
    onComplete: () => void
) => {
    const directory = path.dirname(filePath);
    const sessions = await ReadSessions();
    const sessionIndex = sessions.findIndex(
        session => session.filePath === filePath
    );

    if (sessionIndex !== -1) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            fs.rmSync(directory, { recursive: true, force: true });
        }

        sessions.splice(sessionIndex, 1);
        await WriteSessions(sessions);
        onComplete();
    }
};

export const DeleteAllSessions = async (
    onProgress: (progress: number) => void,
    onComplete: () => void
) => {
    const sessions = await ReadSessions();
    const totalSessions = sessions.length;

    const deleteSession = (index: number) => {
        if (index >= totalSessions) {
            WriteSessions([]).then(() => onComplete());
            return;
        }

        const session = sessions[index];
        const directory = path.dirname(session.filePath);

        if (fs.existsSync(session.filePath)) {
            fs.unlinkSync(session.filePath);
            fs.rmSync(directory, { recursive: true, force: true });
        }

        onProgress(((index + 1) / totalSessions) * 100);

        setTimeout(() => deleteSession(index + 1), 0);
    };

    deleteSession(0);
};

export const ChangeSessionStatus = async (
    filePath: string,
    status: boolean
) => {
    const sessions = await ReadSessions();
    const sessionIndex = sessions.findIndex(
        session => session.filePath === filePath
    );

    if (sessionIndex !== -1) {
        sessions[sessionIndex].alreadyRecovered = status;
        await WriteSessions(sessions);
    }
};
