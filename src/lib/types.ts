import type { Feature } from "geojson";

export type GeometryType =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon"
  | "GeometryCollection";

export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "null";

export interface PropertyStat {
  key: string;
  types: Set<PropertyType>;
  count: number;
  total: number;
}

export interface ParseResult {
  filePath: string;
  fileSizeBytes: number;
  featureCount: number;
  geometryCounts: Record<GeometryType, number>;
  propertyStats: PropertyStat[];
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  features: Feature[];
}

export interface FileParser {
  /** このパーサーが対応する拡張子（例: [".geojson", ".json"]） */
  extensions: string[];
  parse(filePath: string): Promise<ParseResult>;
}

export interface CliOptions {
  noMap: boolean;
  width: number;
  height: number;
  props: number;
}
