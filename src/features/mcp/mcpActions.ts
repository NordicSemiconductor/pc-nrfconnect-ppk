/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    type AppThunk,
    logger,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import type { RootState } from '../../slices';
import {
    getMcpPort,
    mcpServerError,
    mcpServerStarted,
    mcpServerStopped,
} from './mcpSlice';
import { startServer, stopServer } from './ppkMcpServer';

export const startMcpServer =
    (): AppThunk<RootState, Promise<void>> => async (dispatch, getState) => {
        const port = getMcpPort(getState());
        try {
            await startServer(port, { dispatch, getState });
            dispatch(mcpServerStarted({ port }));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to start MCP server: ${message}`);
            dispatch(mcpServerError(message));
        }
    };

export const stopMcpServer =
    (): AppThunk<RootState, Promise<void>> => async dispatch => {
        await stopServer();
        dispatch(mcpServerStopped());
    };

export const toggleMcpServer =
    (): AppThunk<RootState, Promise<void>> => async (dispatch, getState) => {
        if (getState().app.mcp.running) {
            await dispatch(stopMcpServer());
        } else {
            await dispatch(startMcpServer());
        }
    };
