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
    directory: string;
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
            const [pid, startTime, samplingRate, directory] = line.split('\t');
            return {
                pid,
                startTime: Number(startTime),
                samplingRate: Number(samplingRate),
                directory,
            };
        });

    return validLines;
};

export const WriteSessions = async (sessions: Session[]) => {
    const sessionsList = sessions
        .map(
            session =>
                `${session.pid}\t${session.startTime}\t${session.samplingRate}\t${session.directory}`
        )
        .join('\n');

    await fs.promises.writeFile(sessionsListFilePath, sessionsList);
};

export const AddSession = async (
    startTime: number,
    samplingRate: number,
    directory: string
) => {
    const session: Session = {
        pid: process.pid.toString(),
        startTime,
        samplingRate,
        directory,
    };

    const sessions = await ReadSessions();
    sessions.push(session);
    await WriteSessions(sessions);
};

export const RemoveSessionByIndex = async (index: number) => {
    const sessions = await ReadSessions();
    sessions.splice(index, 1);
    await WriteSessions(sessions);
};

export const RemoveSessionByDirectory = async (directory: string) => {
    const filePath = path.join(directory, 'session.raw');
    const sessions = await ReadSessions();
    const sessionIndex = sessions.findIndex(
        session => session.directory === filePath
    );

    if (sessionIndex !== -1) {
        sessions.splice(sessionIndex, 1);
        await WriteSessions(sessions);
    }
};

export const ClearSessions = async () => {
    await fs.promises.unlink(sessionsListFilePath);
};
