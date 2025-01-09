import { getAppDataDir } from '@nordicsemiconductor/pc-nrfconnect-shared';
import fs from 'fs';
import path from 'path';

const appDataFolder = getAppDataDir();
const sessionsListFilePath = path.join(appDataFolder, 'sessions.txt');

export interface Session {
    pid: string;
    directory: string;
}

export const ReadSessions = async (): Promise<Session[]> => {
    if (!fs.existsSync(sessionsListFilePath)) {
        return [];
    }

    const sessionsList = await fs.promises.readFile(sessionsListFilePath, {
        encoding: 'utf8',
    });

    return sessionsList.split('\n').map(session => {
        const [pid, directory] = session.split('\t');
        return { pid, directory };
    });
};

export const WriteSessions = async (sessions: Session[]) => {
    const sessionsList = sessions
        .map(session => `${session.pid}\t${session.directory}`)
        .join('\n');

    await fs.promises.writeFile(sessionsListFilePath, sessionsList);
};

export const AddSession = async (directory: string) => {
    const session: Session = {
        pid: process.pid.toString(),
        directory,
    };

    const sessions = await ReadSessions();
    sessions.push(session);
    await WriteSessions(sessions);
};

export const RemoveSession = async (position: number) => {
    const sessions = await ReadSessions();
    sessions.splice(position, 1);
    await WriteSessions(sessions);
};

export const ClearSessions = async () => {
    await fs.promises.unlink(sessionsListFilePath);
};
