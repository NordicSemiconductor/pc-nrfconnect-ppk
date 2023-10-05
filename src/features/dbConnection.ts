/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import BetterSqlite3, { Database } from 'better-sqlite3';

let db: Database;

type DataEntry = {
    id: number;
    value: number;
    bits: number;
    timestamp: number;
    type: string;
};

export const connectDB = () => {
    // const db = new Database('/tmp/ppk-test.db', { verbose: console.log });
    db = new BetterSqlite3('/tmp/ppk-test.db');

    // Though not required, it is generally important to set the WAL pragma for performance reasons.
    db.pragma('journal_mode = OFF');
    db.pragma('journal_size_limit = 6144000');
    // db.pragma('journal_mode = OFF');
    db.pragma('synchronous = OFF');
    // db.pragma('locking_mode = EXCLUSIVE');
    console.count('Connect to database');
};

export const initializeDB = () => {
    if (!db) connectDB();
    db.prepare('DROP TABLE IF EXISTS ppk').run();
    db.prepare(
        'CREATE TABLE ppk (id INTEGER, value REAL, bits INTEGER, timestamp INTEGER, type TEXT)'
        // 'CREATE TABLE ppk (id INTEGER, value BLOB, bits INTEGER, timestamp INTEGER, type TEXT)'
    ).run();
};

export const insertDB = (
    id: number,
    value: number,
    bits: number,
    timestamp: number,
    type: string
) => {
    if (!db) connectDB();
    const stmt = db.prepare(
        'insert into ppk (id, value, bits, timestamp, type) values (?, ?, ?, ?, ?)'
    );
    stmt.run(id, value, bits, timestamp, type);
};

export const bulkInsertDB = array => {
    // if (!db) connectDB();
    connectDB();
    const stmt = db.prepare(
        'insert into ppk (id, value, bits, timestamp, type) values (?, ?, ?, ?, ?)'
    );
    const insertMany = db.transaction(array => {
        for (let a of array) {
            stmt.run(a.index, a.value, a.bits, a.timestamp, a.type);
        }
    });
    const t1 = performance.now();
    if (array.length !== 0) {
        insertMany(array);
    }
    const t2 = performance.now();
    console.count('Insert');
    console.log(t2 - t1, array.length);
    closeDB();
};

export const getDataFromDB = (
    beginIndex: number,
    endIndex: number
): DataEntry[] => {
    if (!db) connectDB();
    const stmt = db.prepare(
        'SELECT id, value, bits, timestamp, type FROM ppk WHERE id BETWEEN ? and ?'
    );
    return stmt.all(beginIndex, endIndex) as DataEntry[];
};

export const closeDB = () => {
    db.close();
};