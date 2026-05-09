import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { runBlenderJob, resolveBlenderPath } from "./blenderRunner.js";
import type { BlenderConfig, BlenderToolResult } from "./contracts.js";
import { CreateModelSchema, CreateSketchSchema } from "./contracts.js";
import { registerMeasurementTools } from "./measurementTools.js";

export function registerBlenderTools(server: McpServer, config: BlenderConfig): void {
  server.tool("blender_status", "Verify that the local Blender executable is reachable.", {}, async () => {
    try {
      const blenderPath = await resolveBlenderPath(config.blenderPath);
      return textResult({ ok: true, stdout: `Blender command resolved: ${blenderPath}`, stderr: "" });
    } catch (error) {
      return textResult({ ok: false, stdout: "", stderr: error instanceof Error ? error.message : String(error) });
    }
  });

  server.tool("create_2d_sketch", "Legacy utility: create a 2D sketch in Blender from stroke coordinates and save it as a .blend file.", zodShape(CreateSketchSchema), async (input) => {
    const payload = CreateSketchSchema.parse(input);
    return textResult(await runBlenderJob(config, { mode: "sketch", ...payload }, payload.outputFile));
  });

  server.tool("create_3d_model", "Legacy low-level utility: create a primitive-based 3D scene and save it as a .blend file.", zodShape(CreateModelSchema), async (input) => {
    const payload = CreateModelSchema.parse(input);
    return textResult(await runBlenderJob(config, { mode: "model", ...payload }, payload.outputFile));
  });

  registerMeasurementTools(server, config);
}

function zodShape<T extends z.ZodRawShape>(schema: z.ZodObject<T>): T {
  return schema.shape;
}

function textResult(result: BlenderToolResult) {
  const body = JSON.stringify(result, null, 2);
  return { content: [{ type: "text" as const, text: body }], isError: !result.ok };
}
