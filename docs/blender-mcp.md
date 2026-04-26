# Codex Blender MCP

This project exposes a local MCP server that lets Codex create Blender assets.

## Tools

- `blender_status`: verifies the local Blender executable.
- `create_2d_sketch`: creates curve-based 2D strokes in a `.blend` file.
- `create_3d_model`: creates primitive-based 3D scenes in a `.blend` file.
- `run_blender_python`: runs explicit user-approved Blender Python for advanced operations.

## Configuration

```bash
export BLENDER_PATH="/Applications/Blender.app/Contents/MacOS/Blender"
export BLENDER_OUTPUT_DIR="$PWD/outputs"
export BLENDER_TIMEOUT_MS=120000
```

If `BLENDER_PATH` is unset, the server tries `/Applications/Blender.app/Contents/MacOS/Blender`, then `blender` from `PATH`.

## Codex MCP config

After `pnpm install && pnpm build`, register the server command:

```json
{
  "mcpServers": {
    "blender": {
      "command": "node",
      "args": ["/absolute/path/to/dist/server.js"],
      "env": {
        "BLENDER_PATH": "/Applications/Blender.app/Contents/MacOS/Blender",
        "BLENDER_OUTPUT_DIR": "/absolute/path/to/outputs"
      }
    }
  }
}
```

## Example payloads

```json
{
  "strokes": [
    { "points": [[0, 0], [1, 1], [2, 0]], "color": "#111111", "width": 4 }
  ],
  "outputFile": "line-sketch.blend"
}
```

```json
{
  "primitives": [
    { "kind": "cube", "location": [0, 0, 1], "scale": [1, 1, 1], "color": "#8fb3ff" },
    { "kind": "sphere", "location": [2, 0, 1], "scale": [0.75, 0.75, 0.75], "color": "#f28c8c" }
  ],
  "outputFile": "primitive-scene.blend"
}
```
