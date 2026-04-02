import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { flatgeobufParser } from "../../src/parsers/flatgeobuf.js";
import type { ParseResult } from "../../src/lib/types.js";

describe("flatgeobufParser", { timeout: 30_000 }, () => {
  let result: ParseResult;

  beforeAll(async () => {
    result = await flatgeobufParser.parse(resolve("test/data/world.fgb"));
  });

  it("featureCount が 240", () => {
    expect(result.featureCount).toBe(240);
  });

  it("geometryCounts のキー構造が正しい", () => {
    expect(result.geometryCounts).toHaveProperty("Point");
    expect(result.geometryCounts).toHaveProperty("MultiPolygon");
  });

  it("bbox が妥当な範囲", () => {
    const [minLng, minLat, maxLng, maxLat] = result.bbox;
    expect(minLng).toBeGreaterThanOrEqual(-180);
    expect(maxLng).toBeLessThanOrEqual(180);
    expect(minLat).toBeGreaterThanOrEqual(-90);
    expect(maxLat).toBeLessThanOrEqual(90);
  });
});
