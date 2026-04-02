import { describe, it, expect } from "vitest";
import type { Feature } from "geojson";
import { drawMap } from "../../src/lib/drawMap.js";
import { buildParseResult } from "../../src/lib/parseUtils.js";

function pointFeature(lng: number, lat: number): Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {},
  };
}

describe("drawMap", () => {
  const result = buildParseResult("/test.geojson", 100, [
    pointFeature(0, 0),
    pointFeature(10, 10),
    pointFeature(5, 5),
  ]);

  it("空でない文字列を返す", () => {
    const output = drawMap(result, 40, 10);
    expect(output.length).toBeGreaterThan(0);
  });

  it("ブライユ文字 (U+2800-U+28FF) を含む", () => {
    const output = drawMap(result, 40, 10);
    expect(output).toMatch(/[\u2800-\u28FF]/);
  });
});
