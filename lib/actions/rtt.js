import EventEmitter from 'events';

let interval;

export const events = new EventEmitter();

export function read() {
    return new Promise(resolve => {
        resolve('VERSION 1.1.0\r\nNOTCALIBRA R1:510.000 R2:28.000 R3:1.800 Board ID 9889072\r\nUSER SET R1:510.000 R2:28.000 R3:1.800\r\nRefs VDD: 3000 HI: 15066 LO: 49200');
    });
}

export function stop() {
    clearInterval(interval);
}

let t = 0;
export function trigger() {
    stop();
    interval = setInterval(() => {
        for (let i = 0; i < 770; i += 1) {
            t += Math.round(Math.random() * 100) - 50;
            if (t < 0) t = 0;
            if (t > 65535) t = 65535;
            events.emit('trigger', t);
        }
    }, 10);
}

let a = 0;
export function average() {
    stop();
    interval = setInterval(() => {
        for (let i = 0; i < 77; i += 1) {
            a += (Math.random() - ((a + 1) / 2)) / 10;
            events.emit('average', a);
        }
    }, 10);
}
