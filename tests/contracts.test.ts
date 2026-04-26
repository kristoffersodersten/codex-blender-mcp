import { describe, expect, it } from "vitest";
import { CreateModelSchema, CreateSketchSchema } from "../src/contracts.js";

describe("Blender MCP contracts", () => {
  it("accepts a minimal 2D sketch contract", () => {
    const result = CreateSketchSchema.parse({
      strokes: [{ points: [[0, 0], [1, 1]] }]
    });

    expect(result.outputFile).toBe("sketch.blend");
    expect(result.strokes[0]?.color).toBe("#111111");
  });

  it("accepts a minimal 3D primitive model contract", () => {
    const result = CreateModelSchema.parse({
      primitives: [{ kind: "cube" }]
    });

    expect(result.primitives[0]?.scale).toEqual([1, 1, 1]);
    expect(result.camera.location).toEqual([5, -7, 5]);
  });

  it("rejects unsupported colors", () => {
    expect(() =>
      CreateModelSchema.parse({
        primitives: [{ kind: "sphere", color: "blue" }]
      })
    ).toThrow();
  });
});
