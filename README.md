# Codex Blender MCP

Local TypeScript MCP server for controlling Blender from Codex.

```bash
pnpm install
pnpm build
pnpm test
```

## Local-first design

- Runs Blender on the local machine.
- Uses MCP stdio transport.
- Does not include telemetry or cloud fallback.
- Writes generated `.blend` files to `BLENDER_OUTPUT_DIR`.

See [docs/blender-mcp.md](docs/blender-mcp.md) for tool contracts and Codex MCP configuration.
