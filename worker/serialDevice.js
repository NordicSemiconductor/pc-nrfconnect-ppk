/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const { resolve } = require('path');

const { execPath, platform } = process;

const asarPath = (() => {
    switch (true) {
        case /node_modules/.test(execPath):
            return resolve(execPath.split('node_modules')[0]);
        case platform === 'win32':
            return resolve(execPath, '..', 'resources', 'app.asar');
        case platform === 'darwin':
            return resolve(
                execPath.split('/Frameworks/')[0],
                'Resources',
                'app.asar'
            );
        case platform === 'linux':
            return resolve(
                execPath.split('/').slice(0, -1).join('/'),
                'resources',
                'app.asar'
            );
        default:
            return null;
    }
})();

// eslint-disable-next-line import/no-dynamic-require
const { SerialPort } = require(resolve(asarPath, 'node_modules', 'serialport'));

let port = null;
process.on('message', msg => {
    if (msg.open) {
        console.log('\x1b[2J'); // ansi clear screen
        process.send({ opening: msg.open });
        port = new SerialPort({
            path: msg.open,
            autoOpen: false,
            baudRate: 115200,
        });

        const data = Buffer.alloc(4 * 100_000 * 0.06);
        let t = Date.now();
        let index = 0;
        let timeout;

        const send = () => {
            clearTimeout(timeout);
            t = Date.now();
            const dataToSend = data.subarray(0, index);
            process.send(dataToSend, err => {
                if (err) console.log(err);
            });
            index = 0;
        };

        port.on('data', buf => {
            clearTimeout(timeout);

            buf.copy(data, index);
            index += buf.length;

            if (Date.now() - t >= 30) {
                send();
            }

            timeout = setTimeout(send, 30);
        });
        port.open(err => {
            if (err) {
                process.send({ error: err.toString() });
            }
            process.send({ started: msg.open });
        });
    }
    if (msg.write) {
        port.write(msg.write, err => {
            if (err) {
                process.send({ error: 'PPK command failed' });
            }
        });
    }
});

process.on('disconnect', () => {
    console.log('parent process disconnected, cleaning up');
    if (port) {
        port.close(process.exit);
    } else {
        process.exit();
    }
});
