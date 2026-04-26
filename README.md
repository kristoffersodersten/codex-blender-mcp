# Codex Blender MCP

Local-first Model Context Protocol server for creating Blender 2D sketches and 3D models from Codex.

## Description

Codex Blender MCP connects an MCP client to a local Blender installation over stdio. It exposes tools for generating curve-based 2D sketches, primitive-based 3D scenes, and user-approved advanced Blender Python operations.

The server is designed for sovereign local creative workflows: Blender runs on the user's machine, generated `.blend` files are written to a local output directory, and no telemetry or cloud fallback is included.

## Features

- Create 2D sketch scenes from stroke coordinates.
- Create 3D model scenes from Blender primitives.
- Run explicit Blender Python for advanced modeling tasks.
- Validate all tool inputs with typed Zod contracts.
- Keep output paths constrained to `BLENDER_OUTPUT_DIR`.
- Use local Blender execution only.

## Requirements

- Node.js `>=20.11.0`
- pnpm
- Blender installed locally

On macOS, the default Blender path is:

```bash
/Applications/Blender.app/Contents/MacOS/Blender
```

If Blender is elsewhere, set `BLENDER_PATH`.

## Installation

```bash
pnpm install
pnpm build
```

## Configuration

```bash
export BLENDER_PATH="/Applications/Blender.app/Contents/MacOS/Blender"
export BLENDER_OUTPUT_DIR="$PWD/outputs"
export BLENDER_TIMEOUT_MS=120000
```

If `BLENDER_PATH` is unset, the server tries `/Applications/Blender.app/Contents/MacOS/Blender`, then `blender` from `PATH`.

## MCP Client Config

After building the project, register the server with your MCP client:

```json
{
  "mcpServers": {
    "blender": {
      "command": "node",
      "args": ["/absolute/path/to/codex-blender-mcp/dist/src/server.js"],
      "env": {
        "BLENDER_PATH": "/Applications/Blender.app/Contents/MacOS/Blender",
        "BLENDER_OUTPUT_DIR": "/absolute/path/to/outputs",
        "BLENDER_TIMEOUT_MS": "120000"
      }
    }
  }
}
```

## Tools

| Tool | Purpose |
| --- | --- |
| `blender_status` | Verifies that the local Blender executable is reachable. |
| `create_2d_sketch` | Creates curve-based 2D strokes and saves a `.blend` file. |
| `create_3d_model` | Creates a primitive-based 3D scene and saves a `.blend` file. |
| `run_blender_python` | Runs explicit user-approved Blender Python code. |

## Example: 2D Sketch

```json
{
  "strokes": [
    {
      "points": [[0, 0], [1, 1], [2, 0]],
      "color": "#111111",
      "width": 4
    }
  ],
  "outputFile": "line-sketch.blend"
}
```

## Example: 3D Model

```json
{
  "primitives": [
    {
      "kind": "cube",
      "location": [0, 0, 1],
      "scale": [1, 1, 1],
      "color": "#8fb3ff"
    },
    {
      "kind": "sphere",
      "location": [2, 0, 1],
      "scale": [0.75, 0.75, 0.75],
      "color": "#f28c8c"
    }
  ],
  "outputFile": "primitive-scene.blend"
}
```

## Development

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
```

Run the server directly:

```bash
pnpm start
```

## Security And Locality

- No telemetry.
- No cloud fallback.
- No external provider calls.
- Blender execution stays on the local machine.
- Generated files are constrained to the configured output directory.
- `run_blender_python` executes arbitrary Blender Python and should only be used with trusted, explicit user intent.

## Documentation

- [Tool contracts and operation guide](docs/blender-mcp.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

MIT
