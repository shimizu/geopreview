/**
 * GeoJSON パーサー — .geojson / .json ファイルを解析して ParseResult に変換する。
 *
 * 対応する GeoJSON の形式:
 * - FeatureCollection（最も一般的）
 * - 単独の Feature
 * - 素のジオメトリオブジェクト（Feature でラップして処理）
 *
 * 処理の流れ:
 * 1. ファイルを丸ごと読み込んで JSON.parse
 * 2. Feature 配列を1パスで走査し、ジオメトリ種別カウント・プロパティ統計・BBox を収集
 * 3. Feature 数が DRAW_THRESHOLD を超える場合、描画用に等間隔サンプリング
 */

import { readFile, stat } from "node:fs/promises";
import type { Feature, FeatureCollection, GeoJSON, Geometry, Position } from "geojson";
import type { FileParser, GeometryType, ParseResult, PropertyStat, PropertyType } from "../lib/types.js";

const GEOMETRY_TYPES: GeometryType[] = [
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
];

/** 描画用に保持する Feature の最大件数 */
const MAX_DRAW_FEATURES = 5000;
/** この件数を超えると描画用 Feature をサンプリングで間引く */
const DRAW_THRESHOLD = 10000;

/**
 * JavaScript の値から PropertyType を推定する。
 * parseFloat/isNaN は使わず typeof で判定する（仕様準拠）。
 */
function detectPropertyType(value: unknown): PropertyType {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "object") return "object";
  return "string";
}

/**
 * ジオメトリを再帰的に走査し、種別カウントと BBox を更新する。
 * GeometryCollection は含まれるジオメトリに対して再帰呼び出しを行う。
 */
function countGeometry(
  geometry: Geometry,
  counts: Record<GeometryType, number>,
  bbox: [number, number, number, number],
): void {
  counts[geometry.type as GeometryType] = (counts[geometry.type as GeometryType] || 0) + 1;

  switch (geometry.type) {
    case "Point":
      updateBboxFromCoord(geometry.coordinates, bbox);
      break;
    case "MultiPoint":
    case "LineString":
      for (const coord of geometry.coordinates) {
        updateBboxFromCoord(coord, bbox);
      }
      break;
    case "MultiLineString":
    case "Polygon":
      // MultiLineString と Polygon は同じ座標構造（Position[][]）
      for (const ring of geometry.coordinates) {
        for (const coord of ring) {
          updateBboxFromCoord(coord, bbox);
        }
      }
      break;
    case "MultiPolygon":
      for (const polygon of geometry.coordinates) {
        for (const ring of polygon) {
          for (const coord of ring) {
            updateBboxFromCoord(coord, bbox);
          }
        }
      }
      break;
    case "GeometryCollection":
      for (const g of geometry.geometries) {
        countGeometry(g, counts, bbox);
      }
      break;
  }
}

/** 単一座標で BBox（包含矩形）の min/max を更新する */
function updateBboxFromCoord(
  coord: Position,
  bbox: [number, number, number, number],
): void {
  const [lng, lat] = coord;
  if (lng < bbox[0]) bbox[0] = lng;
  if (lat < bbox[1]) bbox[1] = lat;
  if (lng > bbox[2]) bbox[2] = lng;
  if (lat > bbox[3]) bbox[3] = lat;
}

/**
 * Feature の properties から各キーの型と出現回数を集計する。
 * 同一キーに string と number が混在するケース等も Set<PropertyType> で追跡する。
 */
function collectProperties(
  properties: Record<string, unknown> | null,
  statsMap: Map<string, PropertyStat>,
  total: number,
): void {
  if (!properties) return;
  for (const [key, value] of Object.entries(properties)) {
    let s = statsMap.get(key);
    if (!s) {
      s = { key, types: new Set(), count: 0, total };
      statsMap.set(key, s);
    }
    if (value !== null && value !== undefined) {
      s.types.add(detectPropertyType(value));
      s.count++;
    }
  }
}

/**
 * GeoJSON のルート type に応じて Feature 配列を取り出す。
 * 素のジオメトリの場合は空の properties で Feature にラップする。
 */
function toFeatures(geojson: GeoJSON): Feature[] {
  switch (geojson.type) {
    case "FeatureCollection":
      return (geojson as FeatureCollection).features;
    case "Feature":
      return [geojson as Feature];
    default:
      return [{ type: "Feature", geometry: geojson as Geometry, properties: {} }];
  }
}

/**
 * 描画用に Feature を等間隔サンプリングする。
 * 統計は全件で行うが、描画は MAX_DRAW_FEATURES 件に抑えてパフォーマンスを確保する。
 */
function sampleFeatures(features: Feature[]): Feature[] {
  if (features.length <= MAX_DRAW_FEATURES) return features;
  const step = features.length / MAX_DRAW_FEATURES;
  const sampled: Feature[] = [];
  for (let i = 0; i < MAX_DRAW_FEATURES; i++) {
    sampled.push(features[Math.floor(i * step)]);
  }
  return sampled;
}

export const geojsonParser: FileParser = {
  extensions: [".geojson", ".json"],

  async parse(filePath: string): Promise<ParseResult> {
    const [content, fileInfo] = await Promise.all([
      readFile(filePath, "utf-8"),
      stat(filePath),
    ]);

    const geojson: GeoJSON = JSON.parse(content);
    const allFeatures = toFeatures(geojson);

    const geometryCounts = Object.fromEntries(
      GEOMETRY_TYPES.map((t) => [t, 0]),
    ) as Record<GeometryType, number>;

    // BBox の初期値は Infinity/-Infinity。座標が見つかるたびに min/max を更新する
    const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
    const statsMap = new Map<string, PropertyStat>();

    for (const feature of allFeatures) {
      if (feature.geometry) {
        countGeometry(feature.geometry, geometryCounts, bbox);
      }
      collectProperties(feature.properties, statsMap, allFeatures.length);
    }

    // collectProperties で途中参加したキーは total が不正確なので全件数で上書き
    for (const s of statsMap.values()) {
      s.total = allFeatures.length;
    }

    // BBox が点または線（面積ゼロ）の場合、描画時のゼロ除算を防ぐためパディングを追加
    if (bbox[0] === bbox[2]) {
      bbox[0] -= 0.001;
      bbox[2] += 0.001;
    }
    if (bbox[1] === bbox[3]) {
      bbox[1] -= 0.001;
      bbox[3] += 0.001;
    }

    const drawFeatures =
      allFeatures.length > DRAW_THRESHOLD
        ? sampleFeatures(allFeatures)
        : allFeatures;

    return {
      filePath,
      fileSizeBytes: fileInfo.size,
      featureCount: allFeatures.length,
      geometryCounts,
      propertyStats: [...statsMap.values()],
      bbox,
      features: drawFeatures,
    };
  },
};
