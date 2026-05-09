# Architecture

## System Purpose

Measured by Nova converts verified measurements into deterministic Blender geometry and permit-support documentation.

It is not a CAD kernel. It is a measurement-driven visualization and documentation pipeline.

## Layer Contract

| Layer | Responsibility | Authority |
| --- | --- | --- |
| MCP client | User interaction and orchestration. | Never authoritative. |
| TypeScript MCP server | Input validation, project state, tool contracts, quality gates. | Contract authority. |
| Measurement project JSON | Source-of-truth state. | Data authority. |
| Blender bridge | Geometry generation and orthographic rendering. | Renderable geometry authority. |
| Export templates | Layout, labels, metadata, packaging. | Formatting only. |

## Pipeline

```text
input_validation
  -> measurement_modeling
  -> geometry_generation
  -> human_review
  -> model_lock
  -> view_generation
  -> line_rendering
  -> image_postprocess
  -> layout_composition
  -> pdf_export
```

## Non-Negotiable Rules

- Measurements are the primary source of truth.
- Reference photos are secondary and non-authoritative unless calibrated.
- Blender geometry is the only renderable truth.
- Blender orthographic views are the only geometry source for facade exports.
- Export templates must not reconstruct, infer, or mutate geometry.
- The LLM may orchestrate, but it may not decide geometry truth.
- Missing data must create warnings or failures, not guesses.

## Determinism

The same project JSON plus the same Blender bridge version should produce the same geometry and artifact manifest.

Deterministic behavior depends on:

- Strict Zod schemas
- Relative output paths constrained to `BLENDER_OUTPUT_DIR`
- Explicit confidence semantics
- Explicit assumptions
- Model lock before permit-support export
- No hidden remote service calls

## Extension Points

Open-core extension points:

- New typed profiles
- New validation checks
- New generic export templates
- New reference photo metadata

Commercial/private extension points:

- Municipality-specific templates
- Guided UX
- Checklist flows
- Paid QA automation
- Batch/customer workflows

## Capability-Gated Export

Export behavior is constrained by a capability manifest.

The capability manifest defines:

- supported templates
- allowed generation/render/export strategies
- prohibited strategies
- manifest schema version
- bridge version
- Blender minimum version

Permit-support exports must not run strategies that conflict with the manifest. In particular, export-stage geometry reconstruction and CAD claims are prohibited.

## Fixture Matrix

The fixture matrix verifies product behavior across expected pass/fail cases.

Capture contract defines what is required. Fixture matrix verifies that requirements are enforced. Capability manifest defines what the runtime may do.
