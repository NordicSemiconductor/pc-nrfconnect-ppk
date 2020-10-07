/* Copyright (c) 2015 - 2020, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
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
const SerialPort = require(resolve(asarPath, 'node_modules', 'serialport'));

let port = null;
process.on('message', msg => {
    if (msg.open) {
        console.log('\x1b[2J'); // ansi clear screen
        process.send({ opening: msg.open });
        port = new SerialPort(msg.open, { autoOpen: false });

        let data = Buffer.alloc(0);
        port.on('data', buf => {
            data = Buffer.concat([data, buf]);
        });
        setInterval(() => {
            if (data.length === 0) return;
            process.send(data.slice(), err => {
                if (err) console.log(err);
            });
            data = Buffer.alloc(0);
        }, 30);
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
