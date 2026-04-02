import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { geojsonParser } from "../../src/parsers/geojson.js";
import type { ParseResult } from "../../src/lib/types.js";

describe("geojsonParser", { timeout: 30_000 }, () => {
  let result: ParseResult;

  beforeAll(async () => {
    result = await geojsonParser.parse(resolve("test/data/world.geojson"));
  });

  it("featureCount が 240", () => {
    expect(result.featureCount).toBe(240);
  });

  it("MultiPolygon が 0 より大きい", () => {
    expect(result.geometryCounts.MultiPolygon).toBeGreaterThan(0);
  });

  it("bbox が妥当な範囲", () => {
    const [minLng, minLat, maxLng, maxLat] = result.bbox;
    expect(minLng).toBeGreaterThanOrEqual(-180);
    expect(maxLng).toBeLessThanOrEqual(180);
    expect(minLat).toBeGreaterThanOrEqual(-90);
    expect(maxLat).toBeLessThanOrEqual(90);
  });

  it("propertyStats が空でない", () => {
    expect(result.propertyStats.length).toBeGreaterThan(0);
  });

  it("fileSizeBytes が 0 より大きい", () => {
    expect(result.fileSizeBytes).toBeGreaterThan(0);
  });
});
