/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable max-classes-per-file, class-methods-use-this, no-empty-function */

// Test-only stub for the MCP SDK. The real SDK is Node-only and fails to load
// under the jsdom/swc test transform; rendering tests never start the server,
// so these no-op classes are enough to satisfy module evaluation. Wired up via
// jest moduleNameMapper in jest.config.js.

export class McpServer {
    registerTool(): void {}

    connect(): Promise<void> {
        return Promise.resolve();
    }
}

export class StreamableHTTPServerTransport {
    close(): void {}

    handleRequest(): Promise<void> {
        return Promise.resolve();
    }
}
