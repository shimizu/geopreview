import { describe, it, expect } from "vitest";
import { getParser } from "../../src/lib/registry.js";

describe("getParser", () => {
  it(".geojson で geojsonParser を返す", () => {
    const parser = getParser("data/world.geojson");
    expect(parser.extensions).toContain(".geojson");
  });

  it(".json で geojsonParser を返す", () => {
    const parser = getParser("data/file.json");
    expect(parser.extensions).toContain(".json");
  });

  it(".fgb で flatgeobufParser を返す", () => {
    const parser = getParser("data/world.fgb");
    expect(parser.extensions).toContain(".fgb");
  });

  it(".parquet で geoparquetParser を返す", () => {
    const parser = getParser("data/world.parquet");
    expect(parser.extensions).toContain(".parquet");
  });

  it("未対応の拡張子でエラーを投げる", () => {
    expect(() => getParser("data/file.shp")).toThrowError("Unsupported");
  });

  it("大文字拡張子を解決できる", () => {
    const parser = getParser("FILE.GEOJSON");
    expect(parser.extensions).toContain(".geojson");
  });
});
