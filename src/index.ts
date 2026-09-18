#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const retoolUrl = process.env.RETOOL_MCP_URL ?? defaultMcpUrl( process.env.RETOOL_URL );
const accessToken = process.env.RETOOL_MCP_ACCESS_TOKEN;

function defaultMcpUrl(retoolUrl?: string): string {
    if (!retoolUrl) {
        throw new Error(
                "Set RETOOL_MCP_URL or RETOOL_URL to your Retool instance URL."
        );
    }

    return `${retoolUrl.replace( /\/$/, "" )}/mcp`;
}

function requireAccessToken(): string {
    if (!accessToken) {
        throw new Error(
                "Set RETOOL_MCP_ACCESS_TOKEN to an OAuth access token authorized for the required Retool MCP scopes."
        );
    }

    return accessToken;
}

async function main() {
    const remoteClient = new Client( {
        name   : "retool-mcp-proxy",
        version: "1.0.0",
    } );
    const remoteTransport = new StreamableHTTPClientTransport(
            new URL( retoolUrl ),
            {
                requestInit: {
                    headers: {
                        Authorization: `Bearer ${requireAccessToken()}`,
                    },
                },
            }
    );

    await remoteClient.connect( remoteTransport );

    const remoteTools = await remoteClient.listTools();
    if (remoteTools.tools.length === 0) {
        throw new Error(
                "The Retool MCP server returned no tools. Check its enabled toolsets and OAuth scopes."
        );
    }

    const server = new McpServer( {
        name   : "retool-mcp",
        version: "1.0.0",
    } );

    for (const remoteTool of remoteTools.tools) {
        server.registerTool(
                remoteTool.name,
                {
                    title      : remoteTool.title,
                    description: remoteTool.description,
                    annotations: remoteTool.annotations,
                    // The upstream MCP server remains the source of truth for
                    // validation because its JSON Schema can change independently.
                    inputSchema: z.object( {} ).passthrough(),
                },
                async (arguments_) => {
                    const result = await remoteClient.callTool(
                            {
                                name     : remoteTool.name,
                                arguments: arguments_,
                            },
                            CallToolResultSchema
                    );

                    const parsedResult = CallToolResultSchema.safeParse( result );
                    if (parsedResult.success) {
                        return parsedResult.data;
                    }

                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: JSON.stringify( result ),
                            },
                        ],
                    };
                }
        );
    }

    await server.connect( new StdioServerTransport() );
    console.error(
            `Retool MCP proxy connected to ${retoolUrl} with ${remoteTools.tools.length} tools`
    );
}

main().catch( (error: unknown) => {
    const message = error instanceof Error ? error.message : String( error );
    console.error( `Fatal error: ${message}` );
    process.exit( 1 );
} );
