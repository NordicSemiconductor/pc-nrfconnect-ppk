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

export function trigger() {
    stop();
    interval = setInterval(() => {
        for (let i = 0; i < 770; i += 1) {
            events.emit('trigger', Math.round(Math.random() * 65536));
        }
    }, 10);
}

export function average() {
    stop();
    interval = setInterval(() => {
        for (let i = 0; i < 77; i += 1) {
            events.emit('average', Math.random());
        }
    }, 10);
}
