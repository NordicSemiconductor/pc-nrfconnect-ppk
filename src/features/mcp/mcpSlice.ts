/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '../../slices';
import { setMcpServerPort as persistSetPort } from '../../utils/persistentStore';

export const DEFAULT_MCP_PORT = 8730;

interface McpState {
    running: boolean;
    port: number;
    error?: string;
}

// The persisted port is hydrated lazily via hydratePort() to avoid reading the
// persistent store during module evaluation (it participates in an import
// cycle with the slices, which would otherwise yield a partially-loaded module).
const initialState = (): McpState => ({
    running: false,
    port: DEFAULT_MCP_PORT,
    error: undefined,
});

const mcpSlice = createSlice({
    name: 'mcp',
    initialState: initialState(),
    reducers: {
        mcpServerStarted(state, { payload }: PayloadAction<{ port: number }>) {
            state.running = true;
            state.port = payload.port;
            state.error = undefined;
        },
        mcpServerStopped(state) {
            state.running = false;
            state.error = undefined;
        },
        mcpServerError(state, { payload }: PayloadAction<string>) {
            state.running = false;
            state.error = payload;
        },
        setMcpPort(state, { payload }: PayloadAction<number>) {
            persistSetPort(payload);
            state.port = payload;
        },
        hydratePort(state, { payload }: PayloadAction<number>) {
            state.port = payload;
        },
    },
});

export const mcpState = (state: RootState) => state.app.mcp;
export const isMcpServerRunning = (state: RootState) => state.app.mcp.running;
export const getMcpPort = (state: RootState) => state.app.mcp.port;
export const getMcpError = (state: RootState) => state.app.mcp.error;

export const {
    mcpServerStarted,
    mcpServerStopped,
    mcpServerError,
    setMcpPort,
    hydratePort,
} = mcpSlice.actions;

export default mcpSlice.reducer;
