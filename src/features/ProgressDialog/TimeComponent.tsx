/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useRef } from 'react';
import { ProgressBar } from 'react-bootstrap';

const timeString = (
    days: number,
    hours: number,
    minutes: number,
    seconds?: number
) =>
    seconds !== undefined || days > 0 || hours > 0 || minutes > 0
        ? `${days === 1 ? `${days} day ` : ''}${
              days > 1 ? `${days} days ` : ''
          }${days > 0 || hours > 0 ? `${hours} hrs ` : ''}${
              days > 0 || hours > 0 || minutes > 0 ? `${minutes} min ` : ''
          }${
              seconds !== undefined && (hours > 0 || minutes > 0 || seconds > 0)
                  ? `${seconds} sec`
                  : ''
          }`
        : 'less than a minute';

export const splitMS = (ms: number) => {
    const time = ms;
    const days = Math.trunc(ms / (24 * 60 * 60 * 1000));
    ms -= days * 24 * 60 * 60 * 1000;

    const hours = Math.trunc(ms / (60 * 60 * 1000));
    ms -= hours * 60 * 60 * 1000;

    const minutes = Math.trunc(ms / (60 * 1000));
    ms -= minutes * 60 * 1000;

    const seconds = Math.trunc(ms / 1000);
    const millisecond = ms - seconds * 60 * 1000;

    return {
        time,
        days,
        hours,
        minutes,
        seconds,
        millisecond,
    };
};

export const ElapsedTime = ({ time }: { time: number }) => {
    const { days, hours, minutes, seconds } = splitMS(time);
    return (
        <div>
            <span>
                {`Elapsed time: ${
                    time > 1000
                        ? timeString(days, hours, minutes, seconds)
                        : '0 sec'
                }`}
            </span>
        </div>
    );
};

export default ({
    time,
    progress,
    ready = false,
    indeterminate = false,
}: {
    time: number;
    progress: number;
    ready?: boolean;
    indeterminate?: boolean;
}) => {
    const eta = useRef(0);
    if (ready) progress === 100;

    if (progress < 0) {
        progress = 0;
    }

    if (progress > 0 && progress <= 100) {
        const alpha = 0.2;
        const newEta = (100 / progress) * time - time;
        eta.current = alpha * newEta + (1.0 - alpha) * eta.current;
    } else {
        eta.current = 0;
    }

    const {
        days: etaDays,
        hours: etaHours,
        minutes: etaMinutes,
        seconds: etaSeconds,
    } = splitMS(eta.current);

    return (
        <div className="w-100">
            <ElapsedTime time={time} />
            {!indeterminate && !ready && (
                <div>
                    <span>
                        {progress > 0 && progress < 100
                            ? `Remaining time: ${timeString(
                                  etaDays,
                                  etaHours,
                                  Math.round(etaMinutes + etaSeconds / 60)
                              )} (estimated)` // don't show seconds
                            : ''}
                        {progress >= 100 ? 'Remaining time: almost done' : ''}
                        {progress <= 0 ? 'Remaining time: calculating…' : ''}
                    </span>
                    <br />
                </div>
            )}
            <ProgressBar
                now={indeterminate ? 100 : progress}
                style={{ height: '4px' }}
                animated={indeterminate}
            />
        </div>
    );
};
