import { describe, it, expect } from "vitest";
import type { Feature, Geometry } from "geojson";
import type { GeometryType, PropertyStat } from "../../src/lib/types.js";
import {
  detectPropertyType,
  initGeometryCounts,
  countGeometry,
  collectProperties,
  padBbox,
  sampleFeatures,
  buildParseResult,
} from "../../src/lib/parseUtils.js";

// --- ヘルパー ---

function pointFeature(
  lng: number,
  lat: number,
  props: Record<string, unknown> = {},
): Feature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: props,
  };
}

function newBbox(): [number, number, number, number] {
  return [Infinity, Infinity, -Infinity, -Infinity];
}

// --- テスト ---

describe("detectPropertyType", () => {
  it("string を返す", () => expect(detectPropertyType("hello")).toBe("string"));
  it("number を返す", () => expect(detectPropertyType(42)).toBe("number"));
  it("boolean を返す", () => expect(detectPropertyType(true)).toBe("boolean"));
  it("null に対して null を返す", () => expect(detectPropertyType(null)).toBe("null"));
  it("undefined に対して null を返す", () => expect(detectPropertyType(undefined)).toBe("null"));
  it("array を返す", () => expect(detectPropertyType([1, 2])).toBe("array"));
  it("object を返す", () => expect(detectPropertyType({ a: 1 })).toBe("object"));
});

describe("initGeometryCounts", () => {
  it("全7種別が 0 で初期化される", () => {
    const counts = initGeometryCounts();
    const types: GeometryType[] = [
      "Point", "MultiPoint", "LineString", "MultiLineString",
      "Polygon", "MultiPolygon", "GeometryCollection",
    ];
    for (const t of types) {
      expect(counts[t]).toBe(0);
    }
    expect(Object.keys(counts)).toHaveLength(7);
  });
});

describe("countGeometry", () => {
  it("Point をカウントし BBox を更新する", () => {
    const counts = initGeometryCounts();
    const bbox = newBbox();
    const geom: Geometry = { type: "Point", coordinates: [139.7, 35.7] };
    countGeometry(geom, counts, bbox);
    expect(counts.Point).toBe(1);
    expect(bbox).toEqual([139.7, 35.7, 139.7, 35.7]);
  });

  it("Polygon の全頂点で BBox を更新する", () => {
    const counts = initGeometryCounts();
    const bbox = newBbox();
    const geom: Geometry = {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    };
    countGeometry(geom, counts, bbox);
    expect(counts.Polygon).toBe(1);
    expect(bbox).toEqual([0, 0, 10, 10]);
  });

  it("GeometryCollection を再帰的にカウントする", () => {
    const counts = initGeometryCounts();
    const bbox = newBbox();
    const geom: Geometry = {
      type: "GeometryCollection",
      geometries: [
        { type: "Point", coordinates: [1, 2] },
        { type: "LineString", coordinates: [[3, 4], [5, 6]] },
      ],
    };
    countGeometry(geom, counts, bbox);
    expect(counts.GeometryCollection).toBe(1);
    expect(counts.Point).toBe(1);
    expect(counts.LineString).toBe(1);
    expect(bbox).toEqual([1, 2, 5, 6]);
  });

  it("MultiPolygon のネストした座標で BBox を計算する", () => {
    const counts = initGeometryCounts();
    const bbox = newBbox();
    const geom: Geometry = {
      type: "MultiPolygon",
      coordinates: [
        [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
        [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
      ],
    };
    countGeometry(geom, counts, bbox);
    expect(counts.MultiPolygon).toBe(1);
    expect(bbox).toEqual([0, 0, 20, 20]);
  });

  it("複数回呼び出しでカウントが累積する", () => {
    const counts = initGeometryCounts();
    const bbox = newBbox();
    countGeometry({ type: "Point", coordinates: [0, 0] }, counts, bbox);
    countGeometry({ type: "Point", coordinates: [1, 1] }, counts, bbox);
    expect(counts.Point).toBe(2);
  });
});

describe("collectProperties", () => {
  it("プロパティの型と件数を収集する", () => {
    const statsMap = new Map<string, PropertyStat>();
    collectProperties({ name: "Tokyo", pop: 14000000 }, statsMap, 1);
    expect(statsMap.get("name")!.types).toContain("string");
    expect(statsMap.get("name")!.count).toBe(1);
    expect(statsMap.get("pop")!.types).toContain("number");
  });

  it("同一キーで count が累積する", () => {
    const statsMap = new Map<string, PropertyStat>();
    collectProperties({ name: "A" }, statsMap, 2);
    collectProperties({ name: "B" }, statsMap, 2);
    expect(statsMap.get("name")!.count).toBe(2);
  });

  it("null properties の場合は何もしない", () => {
    const statsMap = new Map<string, PropertyStat>();
    collectProperties(null, statsMap, 1);
    expect(statsMap.size).toBe(0);
  });

  it("値が null のキーは count に加算されない", () => {
    const statsMap = new Map<string, PropertyStat>();
    collectProperties({ name: null }, statsMap, 1);
    expect(statsMap.get("name")!.count).toBe(0);
    expect(statsMap.has("name")).toBe(true);
  });
});

describe("padBbox", () => {
  it("点（面積ゼロ）に対して両方向パディングする", () => {
    const bbox: [number, number, number, number] = [10, 20, 10, 20];
    padBbox(bbox);
    expect(bbox[0]).toBeLessThan(10);
    expect(bbox[2]).toBeGreaterThan(10);
    expect(bbox[1]).toBeLessThan(20);
    expect(bbox[3]).toBeGreaterThan(20);
  });

  it("水平線に対して lat 方向のみパディングする", () => {
    const bbox: [number, number, number, number] = [10, 20, 30, 20];
    padBbox(bbox);
    expect(bbox[0]).toBe(10);
    expect(bbox[2]).toBe(30);
    expect(bbox[1]).toBeLessThan(20);
    expect(bbox[3]).toBeGreaterThan(20);
  });

  it("正常な矩形は変更しない", () => {
    const bbox: [number, number, number, number] = [10, 20, 30, 40];
    padBbox(bbox);
    expect(bbox).toEqual([10, 20, 30, 40]);
  });
});

describe("sampleFeatures", () => {
  it("閾値以下はそのまま返す", () => {
    const features = Array.from({ length: 100 }, (_, i) => pointFeature(i, i));
    const result = sampleFeatures(features);
    expect(result).toBe(features);
  });

  it("5000件ちょうどはそのまま返す", () => {
    const features = Array.from({ length: 5000 }, (_, i) => pointFeature(i, i));
    const result = sampleFeatures(features);
    expect(result).toBe(features);
  });

  it("5001件以上は 5000 件にサンプリングされる", () => {
    const features = Array.from({ length: 10000 }, (_, i) => pointFeature(i, i));
    const result = sampleFeatures(features);
    expect(result).toHaveLength(5000);
    expect(result[0]).toBe(features[0]);
  });
});

describe("buildParseResult", () => {
  it("Feature 配列から ParseResult を構築する", () => {
    const features: Feature[] = [
      pointFeature(0, 0, { name: "A" }),
      pointFeature(10, 20, { name: "B", pop: 100 }),
      pointFeature(5, 10, { name: "C" }),
    ];
    const result = buildParseResult("/test.geojson", 1234, features);
    expect(result.filePath).toBe("/test.geojson");
    expect(result.fileSizeBytes).toBe(1234);
    expect(result.featureCount).toBe(3);
    expect(result.geometryCounts.Point).toBe(3);
    expect(result.bbox[0]).toBe(0);
    expect(result.bbox[1]).toBe(0);
    expect(result.bbox[2]).toBe(10);
    expect(result.bbox[3]).toBe(20);
    expect(result.propertyStats.length).toBeGreaterThan(0);
    expect(result.features).toHaveLength(3);
  });

  it("空の Feature 配列でエラーが出ない", () => {
    const result = buildParseResult("/empty.geojson", 0, []);
    expect(result.featureCount).toBe(0);
    expect(result.features).toHaveLength(0);
  });
});
