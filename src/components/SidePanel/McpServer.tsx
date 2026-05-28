/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    Group,
    NumberInput,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { toggleMcpServer } from '../../features/mcp/mcpActions';
import {
    DEFAULT_MCP_PORT,
    getMcpError,
    getMcpPort,
    hydratePort,
    isMcpServerRunning,
    setMcpPort,
} from '../../features/mcp/mcpSlice';
import { getMcpServerPort } from '../../utils/persistentStore';

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    return (
        <Button
            variant="secondary"
            size="sm"
            onClick={() => {
                navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                });
            }}
        >
            {copied ? 'Copied!' : 'Copy'}
        </Button>
    );
};

const CodeSnippet = ({ label, value }: { label: string; value: string }) => (
    <div className="tw-flex tw-flex-col tw-gap-1">
        <div className="tw-flex tw-items-center tw-justify-between">
            <span className="tw-text-[10px] tw-uppercase tw-text-gray-400">
                {label}
            </span>
            <CopyButton text={value} />
        </div>
        <pre className="tw-overflow-x-auto tw-whitespace-pre-wrap tw-break-all tw-rounded tw-bg-gray-700 tw-p-2 tw-text-[10px] tw-text-white">
            {value}
        </pre>
    </div>
);

export default () => {
    const dispatch = useDispatch();
    const running = useSelector(isMcpServerRunning);
    const port = useSelector(getMcpPort);
    const error = useSelector(getMcpError);

    useEffect(() => {
        dispatch(hydratePort(getMcpServerPort(DEFAULT_MCP_PORT)));
    }, [dispatch]);

    const url = `http://127.0.0.1:${port}/mcp`;
    const cliCommand = `claude mcp add --transport http ppk2 ${url}`;
    const jsonConfig = JSON.stringify(
        { mcpServers: { ppk2: { type: 'http', url } } },
        null,
        2,
    );

    return (
        <Group
            collapsible
            heading="MCP server"
            defaultCollapsed
            collapseStatePersistenceId="mcp-server-group"
            gap={8}
        >
            <div className="tw-text-[10px] tw-text-gray-400">
                Expose this device to AI agents over a local MCP endpoint.
                Tools: get_status, measure, set_source_voltage, set_power_mode,
                set_device_power.
            </div>

            <Toggle
                title="Start/stop the local MCP server"
                onToggle={() => dispatch(toggleMcpServer())}
                isToggled={running}
                label="Enable MCP server"
                variant="primary"
            />

            <NumberInput
                label="Port"
                value={port}
                range={{ min: 1024, max: 65535 }}
                disabled={running}
                onChange={value => dispatch(setMcpPort(value))}
            />

            {running && (
                <div className="tw-text-[10px] tw-text-green">
                    Running at {url}
                </div>
            )}

            {error && (
                <div className="tw-text-[10px] tw-text-red">Error: {error}</div>
            )}

            <div className="tw-flex tw-flex-col tw-gap-2">
                <span className="tw-text-[10px] tw-text-gray-400">
                    Connect a client (e.g. Claude Code):
                </span>
                <CodeSnippet label="CLI" value={cliCommand} />
                <CodeSnippet label="Config JSON" value={jsonConfig} />
            </div>
        </Group>
    );
};
