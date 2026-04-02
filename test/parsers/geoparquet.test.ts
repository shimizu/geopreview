import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { geoparquetParser } from "../../src/parsers/geoparquet.js";
import type { ParseResult } from "../../src/lib/types.js";

describe("geoparquetParser", { timeout: 30_000 }, () => {
  let result: ParseResult;

  beforeAll(async () => {
    result = await geoparquetParser.parse(resolve("test/data/world.parquet"));
  });

  it("featureCount が 240", () => {
    expect(result.featureCount).toBe(240);
  });

  it("propertyStats が空でない", () => {
    expect(result.propertyStats.length).toBeGreaterThan(0);
  });

  it("bbox が妥当な範囲", () => {
    const [minLng, minLat, maxLng, maxLat] = result.bbox;
    expect(minLng).toBeGreaterThanOrEqual(-180);
    expect(maxLng).toBeLessThanOrEqual(180);
    expect(minLat).toBeGreaterThanOrEqual(-90);
    expect(maxLat).toBeLessThanOrEqual(90);
  });
});
