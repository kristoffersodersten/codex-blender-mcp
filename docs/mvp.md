# Measured by Nova MVP

## Product Promise

Measured by Nova turns verified real-world measurements into traceable permit-support drawings.

It does not promise CAD, BIM, legal survey accuracy, construction engineering, or guaranteed municipal approval.

## MVP Positioning

Measured by Nova is a measurement-driven modeling and documentation system for small building projects.

Primary message:

```text
Measure. Verify. Generate permit-support drawings.
```

Public wording:

```text
Measured by Nova creates permit-support drawings from verifiable measurements.
You provide real dimensions and reference photos. The system builds a traceable
3D representation and exports orthographic facade documentation without CAD,
consultant dependency, or AI guessing.
```

## First Narrow Use Case

The MVP targets facade-completion packages for small exterior projects.

Initial project types:

- Carport
- Shed
- Deck or terrace
- Small extension-like structures with simple facades

First production template:

- `gothenburg-permit`

Generalized template family:

- `swedish-municipality`
- `permit-facade-pack`

## Source-Of-Truth Contract

| Layer | Authority |
| --- | --- |
| Measurements | Primary source of truth for geometry. |
| Drawings / official PDFs | High-confidence measurement input. |
| Manual site measurements | Medium-confidence measurement input. |
| Photos | Reference only unless calibrated. |
| Blender geometry | Only renderable geometry truth. |
| Blender orthographic views | Only geometry source for permit-support exports. |
| PDF/layout engine | Formatting only; no geometry inference. |
| LLM | Optional orchestration only; never authoritative. |

Hard rules:

- Do not infer missing geometry during export.
- Do not reconstruct geometry from PDF/layout code.
- Do not claim CAD output.
- Do not claim approval guarantee.
- Every exported line should be traceable to measurement input, modeled geometry, or explicitly labeled low-confidence reference context.

## User Responsibility

The user is responsible for:

- Supplying correct measurements.
- Supplying representative photos.
- Reviewing the 3D model before export.
- Submitting and validating material against local municipal requirements.

Measured by Nova is responsible for:

- Preserving measurement confidence.
- Generating deterministic geometry from explicit inputs.
- Rendering locked orthographic views from Blender geometry.
- Producing traceable permit-support documentation.
- Declaring assumptions and low-confidence details.

## MVP Workflow

1. Create project
2. Import reference photos
3. Enter measurements and confidence levels
4. Select project profile
5. Generate Blender model
6. Human review and correction of 3D model
7. Lock approved model
8. Generate orthographic views in Blender
9. Compose permit-support PDF from rendered views
10. Export measurement list and confidence report

## MVP Inputs

Required:

- Project type
- Width, depth, and key heights
- Ground/foundation heights where visible
- Openings and facade side labels
- Material and color notes
- At least one reference photo per relevant facade

Optional:

- Existing permit drawing or PDF
- Boundary distances
- Stairs and level changes
- NCS color codes
- Property and applicant metadata

## MVP Outputs

Minimum export package:

- A3 PDF facade pack
- North, south, east, and west facade views
- Scale label
- Title block
- Material and color notes
- Measurement list
- Confidence legend
- Assumption and limitation notes

Optional export package:

- `.blend`
- `.glb`
- `.obj`
- PNG/SVG orthographic views
- Project JSON
- Validation report

## Acceptance Criteria

The MVP is acceptable only when all are true:

- The 3D model is approved before drawing export.
- `lock_model_for_export` has been run after human review.
- All facade drawings are generated from Blender orthographic views.
- The PDF layer does not reconstruct or alter geometry.
- The output states that it is not CAD/BIM/DWG/STEP.
- Photos are labeled as reference unless calibrated.
- Known dimensions override visual estimates.
- Missing measurements produce warnings, not guesses.
- Low-confidence assumptions do not affect geometry unless resolved before lock.
- `pnpm lint`, `pnpm test`, and `pnpm build` pass.

## Non-Goals

- CAD-kernel modeling
- DWG/STEP output
- Structural calculations
- Automated municipal approval
- AI-based geometry guessing
- Photogrammetry without calibration
- Full BIM object modeling

## Commercial Boundary

Suggested open-core split:

| Public/Open Core | Private/Paid Product |
| --- | --- |
| MCP core | Municipality-specific templates |
| Measurement project schema | PDF styling and QA workflows |
| Blender bridge basics | User-facing UX |
| Generic profiles | Guided intake/checklist flows |
| Example fixtures | Batch export and customer workflow |

First paid package:

```text
Facade Completion Pack
Input: measurements, photos, project metadata.
Output: four facade views, title block, material notes, measurement list, and confidence report.
```
