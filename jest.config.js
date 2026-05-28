/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const config =
    require('@nordicsemiconductor/pc-nrfconnect-shared/config/jest.config')();

// The MCP SDK is Node-only and fails to load under the test transform; stub it.
module.exports = {
    ...config,
    moduleNameMapper: {
        ...(config.moduleNameMapper ?? {}),
        '^@modelcontextprotocol/sdk/server/(mcp|streamableHttp)(\\.js)?$':
            '<rootDir>/src/features/mcp/__mocks__/sdk.ts',
    },
};
