import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { geojsonParser } from "../../src/parsers/geojson.js";
import { flatgeobufParser } from "../../src/parsers/flatgeobuf.js";
import { geoparquetParser } from "../../src/parsers/geoparquet.js";
import type { ParseResult } from "../../src/lib/types.js";

describe("クロスフォーマット一致性", { timeout: 30_000 }, () => {
  let geojson: ParseResult;
  let fgb: ParseResult;
  let parquet: ParseResult;

  beforeAll(async () => {
    [geojson, fgb, parquet] = await Promise.all([
      geojsonParser.parse(resolve("test/data/world.geojson")),
      flatgeobufParser.parse(resolve("test/data/world.fgb")),
      geoparquetParser.parse(resolve("test/data/world.parquet")),
    ]);
  });

  it("featureCount が 3形式で一致", () => {
    expect(fgb.featureCount).toBe(geojson.featureCount);
    expect(parquet.featureCount).toBe(geojson.featureCount);
  });

  it("geometryCounts が 3形式で一致", () => {
    expect(fgb.geometryCounts).toEqual(geojson.geometryCounts);
    expect(parquet.geometryCounts).toEqual(geojson.geometryCounts);
  });

  it("bbox が 3形式でほぼ一致", () => {
    for (let i = 0; i < 4; i++) {
      expect(fgb.bbox[i]).toBeCloseTo(geojson.bbox[i], 3);
      expect(parquet.bbox[i]).toBeCloseTo(geojson.bbox[i], 3);
    }
  });

  it("propertyStats のキー集合が 3形式で一致", () => {
    const keysGj = new Set(geojson.propertyStats.map((s) => s.key));
    const keysFgb = new Set(fgb.propertyStats.map((s) => s.key));
    const keysPq = new Set(parquet.propertyStats.map((s) => s.key));
    expect(keysFgb).toEqual(keysGj);
    expect(keysPq).toEqual(keysGj);
  });
});
