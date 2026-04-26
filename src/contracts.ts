import { z } from "zod";

export const BlenderConfigSchema = z.object({
  blenderPath: z.string().optional(),
  outputDir: z.string().default("outputs"),
  timeoutMs: z.number().int().positive().max(300_000).default(120_000)
});

export type BlenderConfig = z.infer<typeof BlenderConfigSchema>;

export const SketchStrokeSchema = z.object({
  points: z.array(z.tuple([z.number(), z.number()])).min(2),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#111111"),
  width: z.number().positive().max(64).default(3)
});

export const CreateSketchSchema = z.object({
  name: z.string().min(1).max(80).default("codex-sketch"),
  strokes: z.array(SketchStrokeSchema).min(1),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  outputFile: z.string().min(1).max(160).default("sketch.blend")
});

export type CreateSketchInput = z.infer<typeof CreateSketchSchema>;

export const ModelPrimitiveSchema = z.object({
  kind: z.enum(["cube", "sphere", "cylinder", "cone", "torus"]),
  name: z.string().min(1).max(80).optional(),
  location: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  scale: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]).default([1, 1, 1]),
  rotation: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8fb3ff")
});

export const CreateModelSchema = z.object({
  name: z.string().min(1).max(80).default("codex-model"),
  primitives: z.array(ModelPrimitiveSchema).min(1).max(128),
  camera: z
    .object({
      location: z.tuple([z.number(), z.number(), z.number()]).default([5, -7, 5]),
      target: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0])
    })
    .default({}),
  outputFile: z.string().min(1).max(160).default("model.blend")
});

export type CreateModelInput = z.infer<typeof CreateModelSchema>;

export const RunPythonSchema = z.object({
  code: z.string().min(1).max(20_000),
  outputFile: z.string().min(1).max(160).optional()
});

export type RunPythonInput = z.infer<typeof RunPythonSchema>;

export interface BlenderToolResult {
  ok: boolean;
  outputPath?: string;
  stdout: string;
  stderr: string;
}
