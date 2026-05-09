# Measured by Nova

LLM-agnostic, local-first Model Context Protocol server for measurement-driven Blender visualization and permit-support exports.

## Description

Measured by Nova connects any MCP-capable client to a local Blender installation over stdio. Its primary workflow is a measurement project: verified dimensions, drawings, manually measured constraints, and optional reference photos are turned into deterministic Blender geometry and exportable artifacts.

Technical package/repository name: `nova-measured`.

The server is designed for sovereign local creative workflows: Blender runs on the user's machine, generated `.blend` files are written to a local output directory, and no telemetry or cloud fallback is included.

## Product Boundary

Measured is not CAD, BIM, DWG/STEP export, legal surveying, or fabrication-grade tolerance software. It is a measurement-driven 3D visualization and documentation pipeline.

Source-of-truth rules:

- Measurements, drawings, explicit constraints, and calibrated anchors are authoritative for model construction.
- Photos are complementary visual references unless calibration data is provided.
- Blender geometry is the only renderable truth.
- Blender orthographic views are the source of truth for facade/permit exports.
- Export templates may add layout, labels, scale bars, metadata, and notes only; they must not infer or reconstruct geometry.
- The LLM is optional orchestration and is never authoritative.

## MVP Focus

The first product slice is a facade-completion package for small building projects: measure, verify, generate a reviewed 3D representation, then export permit-support facade documentation.

See [MVP product contract](docs/mvp.md).

## Features

- Create measurement projects with confidence-tagged dimensions, planes, openings, steps, and profiles.
- Generate deterministic measured Blender models from typed parametric profiles.
- Use photos as low-confidence references or validation inputs, not as implicit measurement truth.
- Export `.blend`, `.glb`, `.obj`, orthographic elevation views, and permit-support PDF artifacts.
- Keep legacy 2D sketch and primitive 3D tools for low-level utility work.
- Run explicit Blender Python only as an unsafe opt-in fallback.
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

## Tools

| Tool | Purpose |
| --- | --- |
| `blender_status` | Verifies that the local Blender executable is reachable. |
| `create_measurement_project` | Creates a measurement-driven project JSON workspace. |
| `import_reference_photos` | Imports non-calibrated photos as low-confidence reference or validation inputs. |
| `define_known_dimension` | Adds permit, drawing, or manually measured dimension constraints. |
| `define_reference_plane` | Adds measured or inferred reference planes. |
| `define_opening` | Adds door, window, or open bay constraints. |
| `define_step_run` | Adds measured stair runs. |
| `define_assumption` | Records explicit assumptions with confidence and geometry impact. |
| `create_parametric_profile` | Attaches a typed profile such as `carport`. |
| `generate_measured_model` | Generates deterministic Blender visualization geometry from project state. |
| `validate_model` | Validates geometry and confidence rules. |
| `lock_model_for_export` | Locks a human-reviewed model before permit-support export. |
| `generate_elevation_views` | Creates orthographic plan, elevation, and section views. |
| `export_model` | Exports measured artifacts as `.blend`, `.glb`, and/or `.obj`. |
| `export_dimensioned_drawings` | Generates a permit-support visualization PDF artifact. |
| `export_facade_completion_pack` | Exports the MVP facade-completion package from a locked model. |
| `export_project_template` | Exports recipient-specific packages such as `permit-facade-pack`, `gothenburg-permit`, or `client-preview`. |
| `create_2d_sketch` | Creates curve-based 2D strokes and saves a `.blend` file. |
| `create_3d_model` | Creates a primitive-based 3D scene and saves a `.blend` file. |
| `run_blender_python` | Unsafe fallback only; requires explicit opt-in. |

## Measurement Workflow

```json
{ "projectId": "carport-demo", "unit": "mm" }
```

Then import reference photos, define known dimensions, attach a profile, validate, generate the model, and export the requested output profile. The carport profile is the first fixture and uses width, depth, roof slope, high/low side heights, foundation heights, step runs, openings, and context references as structured inputs.

Output is intentionally profile-oriented: the same measured project can later target permit-support drawings, customer previews, fabrication packages, web viewers, or internal QA without changing the source geometry.

Supported export templates are `permit`, `permit-facade-pack`, `swedish-municipality`, `gothenburg-permit`, `measured-visualization`, `client-preview`, `fabrication`, `qa-validation`, `site-context`, `photo-alignment`, `measurement-book`, `web-viewer`, and `archive`.

`cad-simulated` remains as a deprecated legacy alias for old clients. New integrations should not use CAD wording because the export is a measured Blender visualization, not a CAD-kernel result.

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
- [Architecture](docs/architecture.md)
- [MVP product contract](docs/mvp.md)
- [Measurement data contract](docs/data-contract.md)
- [Quality gates](docs/quality-gates.md)
- [Threat model](docs/threat-model.md)
- [Public core policy](docs/public-core.md)
- [Release checklist](docs/release-checklist.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

MIT
