import path from "node:path";
import { describe, expect, it } from "vitest";
import { safeOutputPath } from "../src/blenderRunner.js";

describe("safeOutputPath", () => {
  it("keeps generated files inside outputDir", () => {
    const output = safeOutputPath("/tmp/blender-output", "model.blend");

    expect(output).toBe(path.resolve("/tmp/blender-output/model.blend"));
  });

  it("rejects path traversal", () => {
    expect(() => safeOutputPath("/tmp/blender-output", "../escape.blend")).toThrow(
      "Invalid outputFile outside outputDir"
    );
  });
});
