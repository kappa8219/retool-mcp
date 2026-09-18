# Retool MCP Proxy

A local stdio MCP proxy for Retool's self-hosted MCP server. It discovers the
tools enabled by the Retool Helm chart and forwards calls to the chart's native
MCP endpoint. This keeps the local catalog aligned with Retool instead of
maintaining an incomplete API-v2 approximation.

## Requirements

- A Retool self-hosted deployment with the official `retool` chart's MCP server
  enabled:

  ```yaml
  env:
    BASE_DOMAIN: https://retool.example.com

  mcp:
    enabled: true
  ```

- An OAuth access token authorized for the Retool MCP scopes needed by the
  intended tools. The chart endpoint is `https://retool.example.com/mcp`.

## Quick start

Run without installing:

```bash
RETOOL_URL=https://retool.example.com \
RETOOL_MCP_ACCESS_TOKEN=your-oauth-access-token \
npx -y @kappa8219/retool-mcp
```

Use `RETOOL_MCP_URL` when the MCP endpoint is not the default
`<RETOOL_URL>/mcp`:

```bash
RETOOL_MCP_URL=https://retool.example.com/mcp \
RETOOL_MCP_ACCESS_TOKEN=your-oauth-access-token \
npx -y @kappa8219/retool-mcp
```

## Tool availability

At startup, the proxy calls `tools/list` on Retool and registers every returned
tool locally. Availability therefore reflects both:

- `mcp.config.enabledToolsets` in the deployed Helm chart.
- The scopes granted to `RETOOL_MCP_ACCESS_TOKEN`.

The upstream Retool MCP server remains responsible for validating tool
arguments, so its current schemas and behavior are preserved.

## Configure an MCP client

```json
{
  "mcpServers": {
    "retool": {
      "command": "npx",
      "args": ["-y", "@kappa8219/retool-mcp"],
      "env": {
        "RETOOL_URL": "https://retool.example.com",
        "RETOOL_MCP_ACCESS_TOKEN": "your-oauth-access-token"
      }
    }
  }
}
```

For clients that support remote MCP servers and OAuth, connect directly to
`https://retool.example.com/mcp`; no local proxy is needed.

## Development

```bash
npm install
npm run build
```

## License

MIT
