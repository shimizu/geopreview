import { readFile, stat } from "node:fs/promises";
import type { Feature, FeatureCollection, GeoJSON, Geometry, Position } from "geojson";
import type { GeometryType, ParseResult, PropertyStat, PropertyType } from "./types.js";

const GEOMETRY_TYPES: GeometryType[] = [
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
  "GeometryCollection",
];

const MAX_DRAW_FEATURES = 5000;
const DRAW_THRESHOLD = 10000;

function detectPropertyType(value: unknown): PropertyType {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return t;
  if (t === "object") return "object";
  return "string";
}

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

function toFeatures(geojson: GeoJSON): Feature[] {
  switch (geojson.type) {
    case "FeatureCollection":
      return (geojson as FeatureCollection).features;
    case "Feature":
      return [geojson as Feature];
    default:
      // Bare geometry
      return [{ type: "Feature", geometry: geojson as Geometry, properties: {} }];
  }
}

function sampleFeatures(features: Feature[]): Feature[] {
  if (features.length <= MAX_DRAW_FEATURES) return features;
  const step = features.length / MAX_DRAW_FEATURES;
  const sampled: Feature[] = [];
  for (let i = 0; i < MAX_DRAW_FEATURES; i++) {
    sampled.push(features[Math.floor(i * step)]);
  }
  return sampled;
}

export async function parseGeojson(filePath: string): Promise<ParseResult> {
  const [content, fileInfo] = await Promise.all([
    readFile(filePath, "utf-8"),
    stat(filePath),
  ]);

  const geojson: GeoJSON = JSON.parse(content);
  const allFeatures = toFeatures(geojson);

  const geometryCounts = Object.fromEntries(
    GEOMETRY_TYPES.map((t) => [t, 0]),
  ) as Record<GeometryType, number>;

  const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const statsMap = new Map<string, PropertyStat>();

  for (const feature of allFeatures) {
    if (feature.geometry) {
      countGeometry(feature.geometry, geometryCounts, bbox);
    }
    collectProperties(feature.properties, statsMap, allFeatures.length);
  }

  // total を全件数に更新
  for (const s of statsMap.values()) {
    s.total = allFeatures.length;
  }

  // BBox パディング（面積ゼロ対策）
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
}
