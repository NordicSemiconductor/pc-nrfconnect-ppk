/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- the thunk dispatch is intentionally loose here */

// SDK type-only imports are erased at build/test time. The SDK is heavy and
// Node-only, so its runtime classes are pulled in lazily via loadSdk() when the
// server starts, keeping it out of the module graph during normal rendering.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';
import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';
import http from 'http';
import { z } from 'zod';

import {
    samplingStart,
    samplingStop,
    setDeviceRunning,
    setPowerMode,
    updateRegulator,
} from '../../actions/deviceActions';
import type { RootState } from '../../slices';
import {
    appState,
    deviceOpen as deviceOpenSelector,
    isSamplingRunning,
} from '../../slices/appSlice';
import {
    moveVoltageRegulatorVdd,
    voltageRegulatorState,
} from '../../slices/voltageRegulatorSlice';
import { sampleCount, statsForLast } from './measurementTap';

type McpServerCtor = new (info: { name: string; version: string }) => McpServer;
type TransportCtor = new (options: {
    sessionIdGenerator: undefined;
    enableJsonResponse: boolean;
}) => StreamableHTTPServerTransport;

const SERVER_NAME = 'ppk2';
const SERVER_VERSION = '1.0.0';

const HARD_VDD_MIN = 800;
const HARD_VDD_MAX = 5000;

export interface McpContext {
    dispatch: (action: any) => any;
    getState: () => RootState;
}

const delay = (ms: number) =>
    new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });

const jsonResult = (data: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
});

const statusOf = (getState: () => RootState) => {
    const state = getState();
    const { isSmuMode, deviceRunning, capabilities } = appState(state);
    const { vdd, currentVDD } = voltageRegulatorState(state);
    return {
        deviceOpen: deviceOpenSelector(state),
        mode: isSmuMode ? 'source' : 'ampere',
        sourceVoltageMv: currentVDD,
        targetVoltageMv: vdd,
        devicePower: deviceRunning,
        sampling: isSamplingRunning(state),
        capabilities,
    };
};

const buildServer = (
    McpServerClass: McpServerCtor,
    { dispatch, getState }: McpContext,
): McpServer => {
    const server = new McpServerClass({
        name: SERVER_NAME,
        version: SERVER_VERSION,
    });

    server.registerTool(
        'get_status',
        {
            title: 'Get PPK2 status',
            description:
                'Return the current connection state, measurement mode, source voltage and power-output state of the Power Profiler Kit II.',
            inputSchema: {},
        },
        () => jsonResult(statusOf(getState)),
    );

    server.registerTool(
        'set_source_voltage',
        {
            title: 'Set source voltage',
            description:
                'Set the regulated source voltage (VDD) supplied to the DUT, in millivolts. Only meaningful in source-meter mode; the voltage reaches the DUT only when the power output is enabled.',
            inputSchema: {
                millivolts: z
                    .number()
                    .int()
                    .min(HARD_VDD_MIN)
                    .max(HARD_VDD_MAX)
                    .describe('Target voltage in mV (800-5000).'),
            },
        },
        async ({ millivolts }) => {
            const { min, maxCap } = voltageRegulatorState(getState());
            const lower = Math.max(min, HARD_VDD_MIN);
            const upper = Math.min(maxCap, HARD_VDD_MAX);
            if (millivolts < lower || millivolts > upper) {
                throw new Error(
                    `Voltage ${millivolts} mV is outside the allowed range [${lower}, ${upper}] mV for the current configuration.`,
                );
            }
            dispatch(moveVoltageRegulatorVdd(millivolts));
            await dispatch(updateRegulator());
            return jsonResult(statusOf(getState));
        },
    );

    server.registerTool(
        'set_power_mode',
        {
            title: 'Set power mode',
            description:
                'Switch measurement mode. "source": PPK2 supplies VDD and measures current (SMU). "ampere": PPK2 measures current from an external supply wired in series. Entering source mode turns the output off for safety.',
            inputSchema: {
                mode: z
                    .enum(['source', 'ampere'])
                    .describe('"source" (SMU) or "ampere".'),
            },
        },
        async ({ mode }) => {
            await dispatch(setPowerMode(mode === 'source'));
            return jsonResult(statusOf(getState));
        },
    );

    server.registerTool(
        'set_device_power',
        {
            title: 'Enable/disable DUT power',
            description:
                'Enable or disable the power output to the device under test. In source mode this applies the configured VDD; in ampere mode it closes the pass-through.',
            inputSchema: {
                enable: z
                    .boolean()
                    .describe('true to power the DUT, false to cut power.'),
            },
        },
        async ({ enable }) => {
            await dispatch(setDeviceRunning(enable));
            return jsonResult(statusOf(getState));
        },
    );

    server.registerTool(
        'measure',
        {
            title: 'Measure current',
            description:
                'Sample current draw for a window and return average/min/max in microamps, plus power in mW when in source mode. Starts sampling if it is not already running (and stops it again afterwards). The DUT must be powered for a meaningful reading.',
            inputSchema: {
                duration_ms: z
                    .number()
                    .int()
                    .min(10)
                    .max(2000)
                    .default(500)
                    .describe('Sampling window in milliseconds (10-2000).'),
            },
        },
        async ({ duration_ms: durationMs }) => {
            const wasSampling = isSamplingRunning(getState());
            if (!wasSampling) {
                if (!deviceOpenSelector(getState())) {
                    throw new Error(
                        'PPK2 device is not open. Connect a device in the app first.',
                    );
                }
                await dispatch(samplingStart());
            }
            const startCount = sampleCount();
            await delay(durationMs);
            const captured = sampleCount() - startCount;
            const stats = statsForLast(captured);
            if (!wasSampling) {
                await dispatch(samplingStop());
            }
            if (!stats) {
                throw new Error(
                    'No samples captured. Ensure the device is powered and sampling.',
                );
            }
            const status = statusOf(getState);
            const avgUa = stats.averageMicroAmps;
            const powerMw =
                status.mode === 'source'
                    ? (avgUa * status.sourceVoltageMv) / 1e6
                    : null;
            return jsonResult({
                sampleCount: stats.count,
                durationMs,
                averageMicroAmps: Number(avgUa.toFixed(4)),
                minMicroAmps: Number(stats.minMicroAmps.toFixed(4)),
                maxMicroAmps: Number(stats.maxMicroAmps.toFixed(4)),
                averageMilliAmps: Number((avgUa / 1000).toFixed(6)),
                powerMilliWatts:
                    powerMw === null ? null : Number(powerMw.toFixed(4)),
                sourceVoltageMv: status.sourceVoltageMv,
                mode: status.mode,
            });
        },
    );

    return server;
};

const readBody = (req: http.IncomingMessage): Promise<unknown> =>
    new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(chunk as Buffer));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) {
                resolve(undefined);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });

interface Sdk {
    McpServerClass: McpServerCtor;
    TransportClass: TransportCtor;
}

let sdk: Sdk | null = null;

const loadSdk = async (): Promise<Sdk> => {
    if (sdk) return sdk;
    const [mcpModule, transportModule] = await Promise.all([
        // eslint-disable-next-line import/no-unresolved -- resolved via the SDK's exports map at runtime
        import('@modelcontextprotocol/sdk/server/mcp'),
        // eslint-disable-next-line import/no-unresolved -- resolved via the SDK's exports map at runtime
        import('@modelcontextprotocol/sdk/server/streamableHttp'),
    ]);
    sdk = {
        McpServerClass: mcpModule.McpServer,
        TransportClass: transportModule.StreamableHTTPServerTransport,
    };
    return sdk;
};

let httpServer: http.Server | null = null;

export const isRunning = () => httpServer !== null;

export const startServer = async (
    port: number,
    ctx: McpContext,
): Promise<void> => {
    if (httpServer) return;

    const { McpServerClass, TransportClass } = await loadSdk();

    const requestHandler = async (
        req: http.IncomingMessage,
        res: http.ServerResponse,
    ) => {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
        if (url.pathname !== '/mcp') {
            res.writeHead(404).end('Not found');
            return;
        }
        try {
            const body =
                req.method === 'POST' ? await readBody(req) : undefined;
            // Stateless: a fresh server + transport per request avoids any
            // cross-request session/initialization coupling.
            const transport = new TransportClass({
                sessionIdGenerator: undefined,
                enableJsonResponse: true,
            });
            res.on('close', () => {
                transport.close();
            });
            const server = buildServer(McpServerClass, ctx);
            await server.connect(transport);
            await transport.handleRequest(req, res, body);
        } catch (e) {
            logger.error(`MCP request failed: ${e}`);
            if (!res.headersSent) {
                res.writeHead(500).end('Internal error');
            }
        }
    };

    await new Promise<void>((resolve, reject) => {
        const created = http.createServer((req, res) => {
            requestHandler(req, res).catch(e =>
                logger.error(`MCP handler error: ${e}`),
            );
        });

        created.on('error', err => {
            httpServer = null;
            reject(err);
        });

        created.listen(port, '127.0.0.1', () => {
            httpServer = created;
            logger.info(
                `PPK2 MCP server listening on http://127.0.0.1:${port}/mcp`,
            );
            resolve();
        });
    });
};

export const stopServer = (): Promise<void> =>
    new Promise(resolve => {
        if (!httpServer) {
            resolve();
            return;
        }
        const server = httpServer;
        httpServer = null;
        server.close(() => {
            logger.info('PPK2 MCP server stopped');
            resolve();
        });
    });
