# Measured by Nova Operation Guide

## Description

Measured by Nova is a local, LLM-agnostic Model Context Protocol server that lets any MCP client create Blender assets through deterministic tool contracts. Its primary production workflow is measurement-driven visualization: drawings, known dimensions, manually measured constraints, and typed parametric profiles become reproducible Blender geometry.

Technical package/repository name: `nova-measured`.

The server invokes Blender in background mode and runs a small Python bridge script. Tool inputs are validated in TypeScript before execution, and generated `.blend` files are written to the configured output directory.

## Product And Accuracy Boundary

Measured is not CAD, BIM, DWG/STEP export, legal surveying, or a fabrication tolerance system. It is a measured 3D visualization and permit-support documentation engine.

Architecture contract:

- Measurements are the primary source of truth.
- Reference images are secondary and non-authoritative unless calibrated anchors are provided.
- Blender geometry is the only renderable truth.
- Blender orthographic views are the single source of truth for exported facade drawings.
- Export stages are pure formatting: layout, labels, scale bars, metadata, and PDF/SVG/PNG composition only.
- No geometry reconstruction, AI guessing, or missing-geometry inference is allowed during export.
- The LLM is an optional orchestration layer and is never authoritative.

## Architecture

```text
MCP client
  -> stdio transport
  -> TypeScript MCP server
  -> validated tool contract
  -> measurement project JSON
  -> local Blender process
  -> blender/bridge.py
  -> .blend / GLB / OBJ / visualization and permit-support artifacts
```

## Execution Boundary

| Boundary | Value |
| --- | --- |
| Transport | MCP stdio |
| Compute location | Local machine |
| Blender mode | Background process |
| Output | Local project JSON, `.blend`, `.glb`, `.obj`, orthographic image, and PDF artifacts |
| Network usage | None by design |
| Telemetry | None |

## Measurement Project Model

Project state is stored under:

```text
<BLENDER_OUTPUT_DIR>/measurement-projects/<projectId>/project.json
```

Every public measurement tool returns:

```json
{
  "ok": true,
  "requestId": "uuid",
  "data": {},
  "warnings": []
}
```

Confidence values are part of the contract:

| Confidence | Meaning |
| --- | --- |
| `high` | Permit drawings, official PDFs, known plan dimensions. |
| `medium` | Manual site measurements. |
| `low` | Photo-derived or visually inferred reference details. |

Known dimensions override visual estimates. Non-calibrated photos are never treated as exact geometry.

Every new project carries this source-of-truth policy:

```json
{
  "measurementModel": "explicit_measurements_and_constraints",
  "photos": "non_authoritative_reference_only",
  "blenderGeometry": "only_renderable_geometry_truth",
  "exportStage": "formatting_only_no_geometry_reconstruction",
  "llmRole": "optional_orchestration_never_authoritative",
  "nonGoal": "not_cad_not_bim_not_survey"
}
```

## Measurement Tools

| Tool | Purpose |
| --- | --- |
| `create_measurement_project` | Creates an empty measurement project. |
| `import_reference_photos` | Stores photos as low-confidence references or validation inputs. |
| `define_known_dimension` | Adds an authoritative or measured dimension constraint. |
| `define_reference_plane` | Adds a measured or inferred alignment plane. |
| `define_opening` | Adds a door, window, or open bay constraint. |
| `define_step_run` | Adds stair runs using known rise, going, and count. |
| `define_assumption` | Records explicit assumptions with confidence and geometry impact. |
| `create_parametric_profile` | Adds a reusable structure profile such as `carport`. |
| `generate_measured_model` | Builds deterministic Blender visualization geometry from project state. |
| `validate_model` | Checks known dimensions and confidence rules. |
| `lock_model_for_export` | Locks a human-reviewed model before permit-support export. |
| `generate_elevation_views` | Creates plan, elevation, and section cameras/views. |
| `export_model` | Exports `.blend`, `.glb`, and/or `.obj` artifacts. |
| `export_dimensioned_drawings` | Creates a permit-support visualization PDF artifact. |
| `export_facade_completion_pack` | Exports the MVP facade-completion package from a locked model. |
| `export_project_template` | Creates recipient-specific export packages from unchanged source geometry and unchanged Blender orthographic views. |

## Example: Carport Fixture

```json
{
  "projectId": "carport-demo",
  "profile": "carport",
  "parameters": {
    "widthMm": 7676,
    "depthMm": 6240,
    "roofSlopePercent": 3.7,
    "westHighSideHeightMm": 3455,
    "eastLowSideHeightMm": 3174,
    "foundationHeights": {
      "southwest": { "roadSideMm": 0, "middleMm": 685, "innerMm": 695 },
      "northeast": { "outerTowardRoadMm": 530, "middleMm": 500, "innerMm": 630 }
    },
    "steps": [
      { "stepDepthMm": 295, "stepHeightMm": 140, "count": 3, "locationHint": "entrance/platform" }
    ],
    "neighborBoundary": {
      "from": "outermost_southwest_post",
      "distanceMm": 7692
    }
  }
}
```

The carport profile is a fixture on top of generic primitives. Future profiles should reuse the same project state, confidence model, validation layer, and export pipeline.

## Output Templates

The current bridge can produce measured Blender artifacts, orthographic view images, and technical PDF packages. Templates must never alter geometry.

| Output Template | Expected Artifacts |
| --- | --- |
| `permit` | Plan, elevations, section, scale bars, dimensions, confidence legend. |
| `permit-facade-pack` | Standard facade package from Blender orthographic views. |
| `swedish-municipality` | Swedish municipal layout conventions and title block metadata. |
| `gothenburg-permit` | Göteborg-oriented permit-support facade package. |
| `measured-visualization` | Generic measured visualization package for review. |
| `client-preview` | Textured GLB, perspective renders, simplified dimensions. |
| `fabrication` | Component list, exact element bounds, OBJ/GLB, tolerance notes. |
| `qa-validation` | Validation report, confidence map, reprojection warnings. |
| `site-context` | Situation/context package with boundary distances and reference context. |
| `photo-alignment` | Photo-reference review package with approximation warnings. |
| `measurement-book` | Complete measurement and confidence source book. |
| `web-viewer` | GLB and manifest for web delivery. |
| `archive` | Reproducible project export package. |

This keeps local geometry stable while letting each recipient receive only the representation they need.

`cad-simulated` remains only as a deprecated legacy alias for older clients. New public templates must avoid CAD wording and use `permit-facade-pack`, `swedish-municipality`, `gothenburg-permit`, or `measured-visualization`.

## Open Core Boundary

Recommended packaging:

| Layer | Suggested Visibility |
| --- | --- |
| MCP core, measurement model, validation, Blender integration | Public/open core |
| Municipality-specific PDF templates, styling presets, UX layer, hosted workflow integrations | Private or commercial |

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
      "args": ["/absolute/path/to/nova-measured/dist/src/server.js"],
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
| `name` | string | No | Scene name. Defaults to `measured-sketch`. |
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
| `name` | string | No | Scene name. Defaults to `measured-model`. |
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

Runs explicit Blender Python in a clean scene. This tool is an unsafe fallback for advanced operations that exceed structured contracts.

### Input Schema

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes | Blender Python source code. |
| `outputFile` | string | No | Output `.blend` filename. Defaults to `python-output.blend`. |
| `unsafeAllowExecution` | `true` | Yes | Explicit opt-in gate for unsafe execution. |

### Execution Context

The Python bridge exposes:

- `bpy`
- `math`
- `Vector` from `mathutils`

### Safety Note

`run_blender_python` can execute local Python inside Blender. It requires explicit opt-in, blocks common file-system/process escape tokens, exposes restricted builtins, and should only be used for trusted user-approved code.

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
