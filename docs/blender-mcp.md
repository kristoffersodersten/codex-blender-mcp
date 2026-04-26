# Codex Blender MCP Operation Guide

## Description

Codex Blender MCP is a local Model Context Protocol server that lets an MCP client create Blender assets through deterministic tool contracts. It is intended for local creative automation, design exploration, technical sketching, and simple 3D scene generation.

The server invokes Blender in background mode and runs a small Python bridge script. Tool inputs are validated in TypeScript before execution, and generated `.blend` files are written to the configured output directory.

## Architecture

```text
MCP client
  -> stdio transport
  -> TypeScript MCP server
  -> validated tool contract
  -> local Blender process
  -> blender/bridge.py
  -> .blend output file
```

## Execution Boundary

| Boundary | Value |
| --- | --- |
| Transport | MCP stdio |
| Compute location | Local machine |
| Blender mode | Background process |
| Output | Local `.blend` file |
| Network usage | None by design |
| Telemetry | None |

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `BLENDER_PATH` | No | macOS app path, then `blender` from `PATH` | Blender executable path. |
| `BLENDER_OUTPUT_DIR` | No | `outputs` under the current working directory | Directory for generated `.blend` files. |
| `BLENDER_TIMEOUT_MS` | No | `120000` | Maximum Blender process runtime per tool call. |

## MCP Config

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

## Tool: `blender_status`

### Description

Checks whether the server can resolve a usable local Blender executable.

### Input

No input.

### Output

```json
{
  "ok": true,
  "stdout": "Blender command resolved: /Applications/Blender.app/Contents/MacOS/Blender",
  "stderr": ""
}
```

## Tool: `create_2d_sketch`

### Description

Creates a Blender scene containing curve strokes from 2D point coordinates. Each stroke becomes a beveled Blender curve with a material.

### Input Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | Scene name. Defaults to `codex-sketch`. |
| `strokes` | array | Yes | One or more stroke definitions. |
| `backgroundColor` | hex color | No | World background color. Defaults to `#ffffff`. |
| `outputFile` | string | No | Output `.blend` filename. Defaults to `sketch.blend`. |

Stroke fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `points` | `[number, number][]` | Yes | At least two 2D points. |
| `color` | hex color | No | Stroke color. Defaults to `#111111`. |
| `width` | number | No | Stroke width. Defaults to `3`. |

### Example

```json
{
  "name": "line-study",
  "strokes": [
    {
      "points": [[0, 0], [1, 1], [2, 0]],
      "color": "#111111",
      "width": 4
    }
  ],
  "backgroundColor": "#ffffff",
  "outputFile": "line-study.blend"
}
```

## Tool: `create_3d_model`

### Description

Creates a Blender scene from primitive geometry. Supported primitives are `cube`, `sphere`, `cylinder`, `cone`, and `torus`.

### Input Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | Scene name. Defaults to `codex-model`. |
| `primitives` | array | Yes | One or more primitive definitions. |
| `camera` | object | No | Camera location and target. |
| `outputFile` | string | No | Output `.blend` filename. Defaults to `model.blend`. |

Primitive fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | enum | Yes | `cube`, `sphere`, `cylinder`, `cone`, or `torus`. |
| `name` | string | No | Blender object name. |
| `location` | `[number, number, number]` | No | Object location. Defaults to `[0, 0, 0]`. |
| `scale` | `[number, number, number]` | No | Object scale. Defaults to `[1, 1, 1]`. |
| `rotation` | `[number, number, number]` | No | Euler rotation in degrees. Defaults to `[0, 0, 0]`. |
| `color` | hex color | No | Material color. Defaults to `#8fb3ff`. |

Camera fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `location` | `[number, number, number]` | No | Camera location. Defaults to `[5, -7, 5]`. |
| `target` | `[number, number, number]` | No | Camera target. Defaults to `[0, 0, 0]`. |

### Example

```json
{
  "name": "primitive-study",
  "primitives": [
    {
      "kind": "cube",
      "name": "base",
      "location": [0, 0, 1],
      "scale": [1, 1, 1],
      "color": "#8fb3ff"
    },
    {
      "kind": "sphere",
      "name": "marker",
      "location": [2, 0, 1],
      "scale": [0.75, 0.75, 0.75],
      "color": "#f28c8c"
    }
  ],
  "camera": {
    "location": [5, -7, 5],
    "target": [0, 0, 0]
  },
  "outputFile": "primitive-study.blend"
}
```

## Tool: `run_blender_python`

### Description

Runs explicit Blender Python in a clean scene. This tool is intended for advanced operations that exceed the primitive contracts.

### Input Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes | Blender Python source code. |
| `outputFile` | string | No | Output `.blend` filename. Defaults to `python-output.blend`. |

### Execution Context

The Python bridge exposes:

- `bpy`
- `math`
- `Vector` from `mathutils`

### Safety Note

`run_blender_python` can execute arbitrary local Python inside Blender. Use it only for trusted user-approved code.

## Failure Semantics

Failures are returned as MCP tool errors with a JSON body:

```json
{
  "ok": false,
  "outputPath": "/absolute/path/to/output.blend",
  "stdout": "",
  "stderr": "Causal error message"
}
```

The server treats missing output files as failure even if Blender exits with code `0`.

## Validation

Run:

```bash
pnpm build
pnpm lint
pnpm test
```

Optional local smoke test:

```bash
node --input-type=module -e "import { runBlenderJob } from './dist/src/blenderRunner.js'; const result = await runBlenderJob({ outputDir: 'outputs', timeoutMs: 120000 }, { mode: 'model', name: 'smoke', primitives: [{ kind: 'cube', location: [0,0,1], scale: [1,1,1], rotation: [0,0,0], color: '#8fb3ff' }], camera: { location: [5,-7,5], target: [0,0,0] } }, 'smoke-model.blend'); console.log(JSON.stringify(result, null, 2)); process.exit(result.ok ? 0 : 1);"
```
