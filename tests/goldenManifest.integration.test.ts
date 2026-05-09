import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runBlenderJob } from "../src/blenderRunner.js";
import { DefaultCapabilityManifest } from "../src/capabilityManifest.js";
import { MeasurementProjectSchema } from "../src/measurementContracts.js";
import { materializeProfiles } from "../src/profileGenerator.js";

const ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string(),
  template: z.string(),
  productCategory: z.literal("measured-3d-visualization"),
  notCad: z.literal(true),
  geometryMutationAllowed: z.literal(false),
  sourceOfTruth: z.object({
    measurements: z.literal("primary"),
    photos: z.literal("non-authoritative-reference-only"),
    blenderGeometry: z.literal("only-renderable-truth"),
    exports: z.literal("formatting-only-no-geometry-reconstruction")
  }).strict(),
  capabilityManifest: z.object({
    schemaVersion: z.literal(1),
    supportedTemplates: z.array(z.string())
  }).passthrough(),
  strategies: z.array(z.string()),
  artifacts: z.record(z.string())
}).passthrough();

const ExportStrategies = ["parametric-profile", "blender-orthographic-camera", "freestyle", "manifest", "pdf-layout", "svg-layout", "png-render"];

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashGeometry(project: ReturnType<typeof MeasurementProjectSchema.parse>): string {
  const geometryPayload = {
    elements: project.elements.map((element) => ({
      id: element.id,
      kind: element.kind,
      boundsMm: element.boundsMm,
      confidence: element.confidence,
      source: element.source
    })),
    profiles: project.profiles
  };
  return createHash("sha256").update(stableJson(geometryPayload)).digest("hex");
}

describe("golden manifest integration", () => {
  it("exports a deterministic measured-visualization manifest without mutating project geometry", async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "nova-measured-golden-"));
    const fixtureRaw: unknown = JSON.parse(await readFile("fixtures/synthetic-carport-project.json", "utf8"));
    const project = materializeProfiles(MeasurementProjectSchema.parse(fixtureRaw));
    const geometryBefore = hashGeometry(project);
    const template = "gothenburg-permit";

    async function runExport(runId: string) {
      const templateOutputDir = path.join(outputDir, runId, "exports", template);
      const result = await runBlenderJob(
      { outputDir, timeoutMs: 120_000 },
      {
        mode: "measurement_project",
        operation: "export_template",
        project,
        template,
        templateOutputDir,
        options: {
          scale: "1:100",
          views: ["north", "south", "east", "west"],
          lockedModel: project.modelLock,
          capabilityManifest: DefaultCapabilityManifest,
          strategies: ExportStrategies
        }
      },
        path.join(runId, "exports", template, `${project.projectId}-${template}.blend`)
      );

      expect(result.ok, result.stderr).toBe(true);

      const manifestPath = path.join(templateOutputDir, "manifest.json");
      const manifest = ManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")) as unknown);
      expect(path.resolve(manifestPath).startsWith(`${path.resolve(outputDir)}${path.sep}`)).toBe(true);
      return manifest;
    }

    const manifest = await runExport("run-a");
    const repeatedManifest = await runExport("run-b");
    expect(hashGeometry(project)).toBe(geometryBefore);

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      projectId: "synthetic-carport",
      template,
      productCategory: "measured-3d-visualization",
      notCad: true,
      geometryMutationAllowed: false,
      sourceOfTruth: {
        measurements: "primary",
        photos: "non-authoritative-reference-only",
        blenderGeometry: "only-renderable-truth",
        exports: "formatting-only-no-geometry-reconstruction"
      },
      capabilityManifest: {
        schemaVersion: 1
      },
      strategies: ExportStrategies
    });
    expect(manifest.capabilityManifest.supportedTemplates).toContain("gothenburg-permit");
    expect(Object.keys(manifest.artifacts)).toEqual([
      "eastPng",
      "facadePng",
      "northPng",
      "pdf",
      "planPng",
      "png",
      "sectionPng",
      "southPng",
      "svg",
      "validation",
      "westPng"
    ]);
    expect(manifest.artifacts).toEqual({
      pdf: "synthetic-carport-gothenburg-permit.pdf",
      svg: "synthetic-carport-gothenburg-permit.svg",
      png: "synthetic-carport-gothenburg-permit.png",
      facadePng: "synthetic-carport-facade.png",
      planPng: "synthetic-carport-plan.png",
      northPng: "synthetic-carport-north.png",
      southPng: "synthetic-carport-south.png",
      eastPng: "synthetic-carport-east.png",
      westPng: "synthetic-carport-west.png",
      sectionPng: "synthetic-carport-section.png",
      validation: "synthetic-carport-gothenburg-permit-validation.json"
    });
    expect(stableJson(repeatedManifest)).toBe(stableJson(manifest));
  }, 180_000);
});
