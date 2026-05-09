import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import path from "node:path";
import type { BlenderConfig, BlenderToolResult } from "./contracts.js";
import { runBlenderJob, safeOutputPath } from "./blenderRunner.js";
import { DefaultCapabilityManifest, evaluateCapabilityExecution } from "./capabilityManifest.js";
import { captureToFixture, RealCarportCaptureSchema } from "./captureToFixture.js";
import { materializeProfiles } from "./profileGenerator.js";
import { appendRequestLog, fail, ok, readProject, requestId, writeProject } from "./projectStore.js";
import {
  CarportProfileParametersSchema,
  CreateMeasurementProjectSchema,
  CreateParametricProfileSchema,
  DefineAssumptionSchema,
  DefineKnownDimensionSchema,
  DefineOpeningSchema,
  DefineReferencePlaneInputSchema,
  DefineStepRunSchema,
  ExportDimensionedDrawingsSchema,
  ExportFacadeCompletionPackSchema,
  ExportMeasuredModelSchema,
  ExportProjectTemplateSchema,
  GenerateElevationViewsSchema,
  GenerateMeasuredModelSchema,
  ImportReferencePhotosSchema,
  LockModelForExportSchema,
  MeasurementProjectSchema,
  UnsafeRunPythonSchema,
  ValidateModelSchema,
  type MeasurementProject,
  type ProfileInstance
} from "./measurementContracts.js";

type MachineReason = {
  code: string;
  message: string;
};

type QualityGateResult = {
  ok: boolean;
  blocking: MachineReason[];
  warnings: MachineReason[];
};

const PermitExportStrategies = [
  "parametric-profile",
  "blender-orthographic-camera",
  "freestyle",
  "manifest",
  "pdf-layout",
  "svg-layout",
  "png-render"
];

export function registerMeasurementTools(server: McpServer, config: BlenderConfig): void {
  register(server, "create_project_from_capture", "Convert a verified real capture set into a measurement project without inferring or reconstructing geometry.", RealCarportCaptureSchema, async (input) => {
    const req = requestId();
    const result = captureToFixture(input);
    if (!result.ok) {
      return fail(
        req,
        "capture_contract_failed",
        "Capture cannot become a measurement project until blocking requirements are resolved.",
        result.captureValidation.blocking.map((reason) => `${reason.code}: ${reason.message}`),
        { blocking: result.captureValidation.blocking, warnings: result.captureValidation.warnings }
      );
    }
    await writeProject(config, result.project);
    await appendRequestLog(config, result.project.projectId, req, "create_project_from_capture", input);
    return ok(req, { project: result.project, captureValidation: result.captureValidation }, result.captureValidation.warnings.map((reason) => `${reason.code}: ${reason.message}`));
  });

  register(server, "create_measurement_project", "Create an empty measurement-first visualization project stored as JSON under the configured output directory.", CreateMeasurementProjectSchema, async (input) => {
    const req = requestId();
    const payload = CreateMeasurementProjectSchema.parse(input);
    const project: MeasurementProject = MeasurementProjectSchema.parse({ schemaVersion: 1, projectId: payload.projectId, unit: payload.unit });
    await writeProject(config, project);
    await appendRequestLog(config, project.projectId, req, "create_measurement_project", payload);
    return ok(req, { projectPath: safeOutputPath(config.outputDir, path.join("measurement-projects", project.projectId, "project.json")), project });
  });

  register(server, "import_reference_photos", "Import non-calibrated site photos as low-confidence visual references or validation inputs.", ImportReferencePhotosSchema, async (input) => {
    const req = requestId();
    const payload = ImportReferencePhotosSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    const photos = payload.photos.map((photo) => ({ ...photo, confidence: "low" as const }));
    const next = { ...project, photos: [...project.photos, ...photos] };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "import_reference_photos", payload);
    return ok(req, { photos: next.photos }, ["Photos are non-calibrated and must remain low-confidence visual references unless calibration data is added."]);
  });

  register(server, "define_known_dimension", "Add an authoritative or measured dimension constraint to the project.", DefineKnownDimensionSchema, async (input) => {
    const req = requestId();
    const payload = DefineKnownDimensionSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    const dimension = { label: payload.label, valueMm: payload.valueMm, confidence: payload.confidence, endpoints: payload.endpoints, source: payload.source };
    const next = { ...project, dimensions: [...project.dimensions.filter((d) => d.label !== dimension.label), dimension] };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "define_known_dimension", payload);
    return ok(req, { dimension });
  });

  register(server, "define_reference_plane", "Define a measured or inferred plane used for alignment and drawing generation.", DefineReferencePlaneInputSchema, async (input) => {
    const req = requestId();
    const payload = DefineReferencePlaneInputSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    const plane = { id: payload.id, orientation: payload.orientation, confidence: payload.confidence, originMm: payload.originMm, normal: payload.normal };
    const next = { ...project, planes: [...project.planes.filter((p) => p.id !== plane.id), plane] };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "define_reference_plane", payload);
    return ok(req, { plane });
  });

  register(server, "define_opening", "Add a door, window, or open bay constraint on a known host element.", DefineOpeningSchema, async (input) => {
    const req = requestId();
    const payload = DefineOpeningSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    const opening = { hostElementId: payload.hostElementId, boundsMm: payload.boundsMm, openType: payload.openType, confidence: payload.confidence };
    const next = { ...project, openings: [...project.openings, opening] };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "define_opening", payload);
    return ok(req, { opening });
  });

  register(server, "define_step_run", "Add a measured stair run using known rise, going, and count.", DefineStepRunSchema, async (input) => {
    const req = requestId();
    const payload = DefineStepRunSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    const step = { id: payload.id, stepDepthMm: payload.stepDepthMm, stepHeightMm: payload.stepHeightMm, count: payload.count, locationHint: payload.locationHint, confidence: payload.confidence };
    const next = { ...project, steps: [...project.steps.filter((s) => s.id !== step.id), step] };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "define_step_run", payload);
    return ok(req, { step });
  });

  register(server, "define_assumption", "Record an explicit project assumption with confidence and geometry impact.", DefineAssumptionSchema, async (input) => {
    const req = requestId();
    const payload = DefineAssumptionSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    const assumption = { id: payload.id, text: payload.text, confidence: payload.confidence, source: payload.source, affectsGeometry: payload.affectsGeometry };
    const next = { ...project, assumptions: [...project.assumptions.filter((item) => item.id !== assumption.id), assumption] };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "define_assumption", payload);
    return ok(req, { assumption });
  });

  register(server, "create_parametric_profile", "Attach a typed parametric structure profile to the project; carport is the first reusable profile.", CreateParametricProfileSchema, async (input) => {
    const req = requestId();
    const payload = CreateParametricProfileSchema.parse(input);
    const project = await readProject(config, payload.projectId);
    let profile: ProfileInstance;
    if (payload.profile === "carport") {
      profile = { id: "profile-carport", profile: "carport", parameters: CarportProfileParametersSchema.parse(payload.parameters), confidence: "high" };
    } else {
      profile = { id: `profile-${payload.profile}`, profile: payload.profile, parameters: parseRecordParameters(payload.parameters), confidence: "medium" };
    }
    const next = materializeProfiles({ ...project, profiles: [...project.profiles.filter((p) => p.id !== profile.id), profile] });
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "create_parametric_profile", payload);
    return ok(req, { profile, elementCount: next.elements.length });
  });

  register(server, "generate_measured_model", "Generate deterministic Blender visualization geometry from explicit measurements, constraints, and parametric elements.", GenerateMeasuredModelSchema, async (input) => {
    const req = requestId();
    const payload = GenerateMeasuredModelSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const outputBlend = payload.outputBlend ?? path.join("measurement-projects", payload.projectId, "artifacts", `${payload.projectId}.blend`);
    const result = await runBlenderJob(config, { mode: "measurement_project", operation: "generate_model", project }, outputBlend);
    const next = { ...project, artifacts: { ...project.artifacts, blend: result.outputPath ?? outputBlend } };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "generate_measured_model", payload);
    return ok(req, { blender: result, artifacts: next.artifacts }, result.ok ? [] : ["Blender generation failed; inspect stderr."]);
  });

  register(server, "validate_model", "Validate generated project geometry against known dimensions and confidence rules.", ValidateModelSchema, async (input) => {
    const req = requestId();
    const payload = ValidateModelSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const validation = validateProject(project, payload.checks);
    const next = { ...project, validation };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "validate_model", payload);
    return ok(req, { validation }, validation.warnings);
  });

  register(server, "lock_model_for_export", "Lock a human-reviewed model so permit-support exports can be generated without geometry changes.", LockModelForExportSchema, async (input) => {
    const req = requestId();
    const payload = LockModelForExportSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const gate = qualityGate(project);
    if (!gate.ok) {
      return fail(req, "quality_gate_failed", "Model cannot be locked until quality gates pass.", formatReasons(gate), { blocking: gate.blocking });
    }
    const next = { ...project, modelLock: { locked: true, lockedAt: new Date().toISOString(), lockedBy: payload.lockedBy, reason: payload.reason } };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "lock_model_for_export", payload);
    return ok(req, { modelLock: next.modelLock }, formatReasons(gate));
  });

  register(server, "generate_elevation_views", "Create locked orthographic plan, elevation, and section cameras/render targets from Blender geometry.", GenerateElevationViewsSchema, async (input) => {
    const req = requestId();
    const payload = GenerateElevationViewsSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const result = await runBlenderJob(config, { mode: "measurement_project", operation: "elevation_views", project, views: payload.views }, path.join("measurement-projects", payload.projectId, "artifacts", `${payload.projectId}-views.blend`));
    await appendRequestLog(config, payload.projectId, req, "generate_elevation_views", payload);
    return ok(req, { blender: result, views: payload.views });
  });

  register(server, "export_model", "Export the measured project model as blend, GLB, and/or OBJ artifacts.", ExportMeasuredModelSchema, async (input) => {
    const req = requestId();
    const payload = ExportMeasuredModelSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const result = await runBlenderJob(config, { mode: "measurement_project", operation: "export_model", project, formats: payload.formats }, path.join("measurement-projects", payload.projectId, "artifacts", `${payload.projectId}-export.blend`));
    await appendRequestLog(config, payload.projectId, req, "export_model", payload);
    return ok(req, { blender: result, formats: payload.formats });
  });

  register(server, "export_dimensioned_drawings", "Generate a permit-oriented visualization PDF with dimension annotations, scale bars, and a confidence legend.", ExportDimensionedDrawingsSchema, async (input) => {
    const req = requestId();
    const payload = ExportDimensionedDrawingsSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const result = await runBlenderJob(config, { mode: "measurement_project", operation: "dimensioned_drawings", project, outputPath: safeOutputPath(config.outputDir, payload.outputPath), scale: payload.scale, includeConfidenceLegend: payload.includeConfidenceLegend }, path.join("measurement-projects", payload.projectId, "artifacts", `${payload.projectId}-drawings.blend`));
    await appendRequestLog(config, payload.projectId, req, "export_dimensioned_drawings", payload);
    return ok(req, { blender: result, outputPath: safeOutputPath(config.outputDir, payload.outputPath) });
  });

  register(server, "export_facade_completion_pack", "Export the MVP facade-completion package from a locked measured model using Blender orthographic views.", ExportFacadeCompletionPackSchema, async (input) => {
    const req = requestId();
    const payload = ExportFacadeCompletionPackSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const gate = qualityGate(project);
    const capability = evaluateCapabilityExecution(DefaultCapabilityManifest, { template: payload.template, strategies: PermitExportStrategies });
    if (!project.modelLock.locked) {
      return fail(req, "model_not_locked", "Run lock_model_for_export after human review before exporting a facade-completion package.", formatReasons(gate), { blocking: [{ code: "model_not_locked", message: "Human-reviewed model lock is required before permit-support export." }] });
    }
    if (!gate.ok) {
      return fail(req, "quality_gate_failed", "Facade-completion export requires all quality gates to pass.", formatReasons(gate), { blocking: gate.blocking });
    }
    if (!capability.ok) {
      return fail(req, "capability_gate_failed", "Facade-completion export requires an allowed capability strategy set.", capability.blocking.map((reason) => `${reason.code}: ${reason.message}`), { blocking: capability.blocking });
    }
    const outputDir = payload.outputDir ?? path.join("measurement-projects", payload.projectId, "exports", payload.template);
    const outputBlend = path.join(outputDir, `${payload.projectId}-${payload.template}.blend`);
    const result = await runBlenderJob(config, {
      mode: "measurement_project",
      operation: "export_template",
      project,
      template: payload.template,
      templateOutputDir: safeOutputPath(config.outputDir, outputDir),
      options: { scale: payload.scale, views: payload.views, lockedModel: project.modelLock, capabilityManifest: DefaultCapabilityManifest, strategies: PermitExportStrategies }
    }, outputBlend);
    const artifactKey = `facadeCompletionPack:${payload.template}`;
    const next = { ...project, artifacts: { ...project.artifacts, [artifactKey]: safeOutputPath(config.outputDir, outputDir) } };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "export_facade_completion_pack", payload);
    return ok(req, { blender: result, template: payload.template, outputDir: next.artifacts[artifactKey], qualityGate: gate, capability }, exportTemplateWarnings(payload.template));
  });

  register(server, "export_project_template", "Export a recipient-specific measured visualization package without changing or reconstructing project geometry.", ExportProjectTemplateSchema, async (input) => {
    const req = requestId();
    const payload = ExportProjectTemplateSchema.parse(input);
    const project = materializeProfiles(await readProject(config, payload.projectId));
    const outputDir = payload.outputDir ?? path.join("measurement-projects", payload.projectId, "exports", payload.template);
    const outputBlend = path.join(outputDir, `${payload.projectId}-${payload.template}.blend`);
    const result = await runBlenderJob(config, { mode: "measurement_project", operation: "export_template", project, template: payload.template, templateOutputDir: safeOutputPath(config.outputDir, outputDir), options: payload.options }, outputBlend);
    const artifactKey = `template:${payload.template}`;
    const next = { ...project, artifacts: { ...project.artifacts, [artifactKey]: safeOutputPath(config.outputDir, outputDir) } };
    await writeProject(config, next);
    await appendRequestLog(config, payload.projectId, req, "export_project_template", payload);
    return ok(req, { blender: result, template: payload.template, outputDir: next.artifacts[artifactKey] }, exportTemplateWarnings(payload.template));
  });

  register(server, "run_blender_python", "UNSAFE fallback only. Runs explicit user-approved Blender Python after opt-in, with restricted builtins/imports and audit logging.", UnsafeRunPythonSchema, async (input) => {
    const req = requestId();
    const payload = UnsafeRunPythonSchema.parse(input);
    const result = await runBlenderJob(config, { mode: "python", ...payload, requestId: req }, payload.outputFile ?? "python-output.blend");
    return ok(req, { blender: result }, ["Unsafe Python execution was explicitly allowed and audited."]);
  });
}

function exportTemplateWarnings(template: string): string[] {
  const warnings = [
    "This server produces measured 3D visualization and permit-support artifacts, not CAD, BIM, DWG/STEP, or survey-grade output.",
    "Export templates must format Blender orthographic views only; they must not reconstruct, infer, or mutate geometry."
  ];
  if (template === "cad-simulated") {
    warnings.unshift("Template 'cad-simulated' is a deprecated legacy alias; use 'permit-facade-pack', 'swedish-municipality', or 'gothenburg-permit' for public workflows.");
  }
  return warnings;
}

export function qualityGate(project: MeasurementProject): QualityGateResult {
  const blocking: MachineReason[] = [];
  const warnings: MachineReason[] = [];
  if (project.photos.length === 0) {
    blocking.push({
      code: "reference_photos_missing",
      message: "At least one reference photo should be imported before facade export."
    });
  }
  if (project.dimensions.length === 0 && project.profiles.length === 0) {
    blocking.push({
      code: "measurement_source_missing",
      message: "At least one known dimension or typed profile is required."
    });
  }
  if (project.assumptions.some((assumption) => assumption.affectsGeometry && assumption.confidence === "low")) {
    blocking.push({
      code: "low_confidence_geometry_assumption",
      message: "Low-confidence assumptions affecting geometry must be resolved or explicitly upgraded before export."
    });
  }
  if (!project.validation.ok) {
    blocking.push({
      code: "validation_failed",
      message: "Project validation is not passing."
    });
  }
  const requiredViews = ["north", "south", "east", "west"];
  const availableViewLabels = new Set([
    ...project.photos.map((photo) => photo.view?.toLowerCase()).filter((value): value is string => Boolean(value)),
    ...project.planes.map((plane) => plane.id.toLowerCase())
  ]);
  const missingViewReferences = requiredViews.filter((view) => !availableViewLabels.has(view));
  if (missingViewReferences.length > 0) {
    blocking.push({
      code: "facade_reference_missing",
      message: `Missing facade reference labels for: ${missingViewReferences.join(", ")}.`
    });
  }
  return { ok: blocking.length === 0, blocking, warnings };
}

function formatReasons(gate: QualityGateResult): string[] {
  return [...gate.blocking, ...gate.warnings].map((reason) => `${reason.code}: ${reason.message}`);
}

function register<T extends z.ZodObject<z.ZodRawShape>>(server: McpServer, name: string, description: string, schema: T, handler: (input: z.infer<T>) => Promise<unknown>): void {
  server.tool(name, description, schema.shape, async (input) => {
    try {
      const body = await handler(input);
      const text = JSON.stringify(body, null, 2);
      return { content: [{ type: "text" as const, text }], isError: isErrorBody(body) };
    } catch (error) {
      const body = fail(requestId(), "tool_error", error instanceof Error ? error.message : String(error));
      return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }], isError: true };
    }
  });
}

function isErrorBody(value: unknown): boolean {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false;
}

function parseRecordParameters(parameters: unknown): Record<string, unknown> {
  if (typeof parameters !== "object" || parameters === null || Array.isArray(parameters)) {
    throw new Error("Generic profile parameters must be an object.");
  }
  return parameters as Record<string, unknown>;
}

function validateProject(project: MeasurementProject, checks: string[]) {
  const result = { ok: true, checks: [] as Array<{ name: string; ok: boolean; message: string; confidence?: "high" | "medium" | "low" }>, warnings: [] as string[] };
  if (checks.includes("known_dimensions")) {
    const carport = project.profiles.find((profile): profile is Extract<ProfileInstance, { profile: "carport" }> => profile.profile === "carport");
    if (carport) {
      const expected = [
        ["width", carport.parameters.widthMm],
        ["depth", carport.parameters.depthMm],
        ["westHighSideHeight", carport.parameters.westHighSideHeightMm],
        ["eastLowSideHeight", carport.parameters.eastLowSideHeightMm]
      ] as const;
      for (const [name, value] of expected) {
        result.checks.push({ name: `known_dimensions:${name}`, ok: value > 0, message: `${name}=${value}mm`, confidence: "high" });
      }
      const roofDelta = carport.parameters.westHighSideHeightMm - carport.parameters.eastLowSideHeightMm;
      const impliedSlope = (roofDelta / carport.parameters.depthMm) * 100;
      const okSlope = Math.abs(impliedSlope - carport.parameters.roofSlopePercent) <= 1;
      result.checks.push({ name: "known_dimensions:roof_slope", ok: okSlope, message: `implied=${impliedSlope.toFixed(2)}%, declared=${carport.parameters.roofSlopePercent}%`, confidence: "high" });
      result.ok &&= okSlope;
    } else {
      result.ok = false;
      result.checks.push({ name: "known_dimensions:profile", ok: false, message: "No carport profile present." });
    }
  }
  if (checks.includes("photo_orientation") && project.photos.length > 0) {
    result.warnings.push("Photos are non-calibrated; orientation checks are advisory only.");
  }
  if (checks.includes("reprojection_error")) {
    result.warnings.push("Reprojection validation requires calibrated anchors; current photo-only details remain low confidence.");
  }
  return result;
}

export function textResult(result: BlenderToolResult) {
  const body = JSON.stringify(result, null, 2);
  return { content: [{ type: "text" as const, text: body }], isError: !result.ok };
}
