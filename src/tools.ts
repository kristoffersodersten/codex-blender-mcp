import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import { runBlenderJob, resolveBlenderPath } from "./blenderRunner.js";
import type { BlenderConfig, BlenderToolResult } from "./contracts.js";
import { CreateModelSchema, CreateSketchSchema, RunPythonSchema } from "./contracts.js";

export function registerBlenderTools(server: McpServer, config: BlenderConfig): void {
  server.tool("blender_status", "Verify that the local Blender executable is reachable.", {}, async () => {
    try {
      const blenderPath = await resolveBlenderPath(config.blenderPath);
      return textResult({ ok: true, stdout: `Blender command resolved: ${blenderPath}`, stderr: "" });
    } catch (error) {
      return textResult({ ok: false, stdout: "", stderr: errorMessage(error) });
    }
  });

  server.tool(
    "create_2d_sketch",
    "Create a 2D sketch in Blender from stroke coordinates and save it as a .blend file.",
    zodShape(CreateSketchSchema),
    async (input) => {
      const payload = CreateSketchSchema.parse(input);
      return textResult(await runBlenderJob(config, { mode: "sketch", ...payload }, payload.outputFile));
    }
  );

  server.tool(
    "create_3d_model",
    "Create a 3D model in Blender from primitive geometry and save it as a .blend file.",
    zodShape(CreateModelSchema),
    async (input) => {
      const payload = CreateModelSchema.parse(input);
      return textResult(await runBlenderJob(config, { mode: "model", ...payload }, payload.outputFile));
    }
  );

  server.tool(
    "run_blender_python",
    "Run explicit local Blender Python code. Use only for user-approved advanced modeling operations.",
    zodShape(RunPythonSchema),
    async (input) => {
      const payload = RunPythonSchema.parse(input);
      return textResult(await runBlenderJob(config, { mode: "python", ...payload }, payload.outputFile ?? "python-output.blend"));
    }
  );
}

function zodShape<T extends z.ZodRawShape>(schema: z.ZodObject<T>): T {
  return schema.shape;
}

function textResult(result: BlenderToolResult) {
  const body = JSON.stringify(result, null, 2);
  return {
    content: [{ type: "text" as const, text: body }],
    isError: !result.ok
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
