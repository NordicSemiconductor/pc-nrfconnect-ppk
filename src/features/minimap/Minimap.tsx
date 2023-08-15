import React, { useRef } from 'react';
import { logger, useHotKey } from 'pc-nrfconnect-shared';

import { options } from '../../globals';

const Minimap = () => {
    const minimapRef = useRef<HTMLCanvasElement | null>(null);

    useHotKey({
        hotKey: 'alt+d',
        title: 'Draw Minimap',
        isGlobal: false,
        action: () => {
            if (minimapRef.current != null) {
                draw(minimapRef.current);
                console.log('Drawing');
            }
        },
    });

    return (
        <canvas
            ref={minimapRef}
            id="minimap"
            className="tw-h-20 tw-w-full tw-border-solid tw-border-2 tw-border-black"
        />
    );
};

function draw(minimap: HTMLCanvasElement) {
    if (minimap.getContext) {
        const ctx = minimap.getContext('2d');
        if (ctx == null) return;

        logger.info('Will begin to draw minimap');

        const totalWidth = options.data.length;
        const totalHeight = options.data.reduce(
            (max, value) => (value > max ? value : max),
            0
        );

        const mapWidth = minimap.width;
        const mapHeight = minimap.height;

        logger.info(`width=${mapWidth},height=${mapHeight}`);

        const xScale = mapWidth / totalWidth;
        const yScale = mapHeight / totalHeight;

        const initialX = 0;
        const initialY = mapHeight - options.data[0] * yScale;

        logger.info('Initial', initialX, ',', initialY);

        ctx.clearRect(0, 0, mapWidth, mapHeight);
        ctx.fillStyle = '#00a9ce';
        ctx.lineWidth = 0.1;
        ctx.moveTo(initialX, initialY);

        ctx.beginPath();
        for (let i = 1; i <= options.index; i += 100) {
            const xPosition = i * xScale;
            const yPosition = mapHeight - options.data[i] * yScale;
            ctx.lineTo(xPosition, yPosition);

            if (i % 100_000 === 0) {
                logger.info(`${i}: (x=${xPosition},y=${yPosition})`);
            }
        }
        ctx.stroke();

        logger.info('Finished drawing minimap');
    }
}

export default Minimap;
