/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable global-require, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

// The MCP SDK only exposes its subpaths through the package "exports" map's
// "./*" wildcard, whose runtime targets require the explicit ".js" extension.
// The bundler externalizes dependencies as require(), so we must request the
// extension here, otherwise Node's resolver throws MODULE_NOT_FOUND at startup.
// The runtime require is stubbed in tests via jest moduleNameMapper.
//
// We expose deliberately simplified types: the SDK's real registerTool generics
// are so deep that the type checker reports TS2589 ("excessively deep"), so we
// describe only the small surface this feature uses.

import type { StreamableHTTPServerTransport as TransportInstance } from '@modelcontextprotocol/sdk/server/streamableHttp';

interface ToolConfig {
    title?: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

type ToolResult = {
    content: { type: 'text'; text: string }[];
    structuredContent?: Record<string, unknown>;
};

export interface McpServerLike {
    registerTool(
        name: string,
        config: ToolConfig,
        cb: (args: any) => ToolResult | Promise<ToolResult>,
    ): unknown;
    connect(transport: TransportInstance): Promise<void>;
}

export type McpServerCtor = new (info: {
    name: string;
    version: string;
}) => McpServerLike;

export type TransportCtor = new (options: {
    sessionIdGenerator: undefined;
    enableJsonResponse: boolean;
}) => TransportInstance;

export const McpServer: McpServerCtor =
    require('@modelcontextprotocol/sdk/server/mcp.js').McpServer;

export const StreamableHTTPServerTransport: TransportCtor =
    require('@modelcontextprotocol/sdk/server/streamableHttp.js').StreamableHTTPServerTransport;
