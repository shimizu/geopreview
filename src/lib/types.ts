/**
 * アプリケーション全体で使用する共通型定義。
 *
 * ParseResult がすべてのパーサーとUIコンポーネントを繋ぐ中心的なデータ構造。
 * 新しいファイル形式を追加する場合も、最終的に ParseResult を返すようにすれば
 * UI 側の変更は不要になる。
 */

import type { Feature } from "geojson";

/** GeoJSON 仕様で定義されている全ジオメトリ種別 */
export type GeometryType =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon"
  | "GeometryCollection";

/** プロパティ値の型判定結果。typeof + Array.isArray で分類する */
export type PropertyType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "null";

/** 各プロパティキーの統計情報（型の種類・値が存在する件数・全件数） */
export interface PropertyStat {
  key: string;
  /** 同一キーに複数の型が混在する場合があるため Set で保持 */
  types: Set<PropertyType>;
  /** 値が null/undefined でない Feature の件数 */
  count: number;
  /** Feature の総数（充足率 = count / total） */
  total: number;
}

/**
 * パーサーの解析結果。すべてのUIコンポーネントはこの型を通じてデータを受け取る。
 * 新しいファイル形式のパーサーを追加する際も、この型に変換して返すこと。
 */
export interface ParseResult {
  filePath: string;
  fileSizeBytes: number;
  featureCount: number;
  geometryCounts: Record<GeometryType, number>;
  propertyStats: PropertyStat[];
  /** [minLng, minLat, maxLng, maxLat] — 全座標の包含矩形 */
  bbox: [number, number, number, number];
  /** 描画用 Feature 配列。大量データの場合は間引き済みのものが入る */
  features: Feature[];
}

/**
 * ファイルパーサーの共通インターフェース。
 *
 * 新しいファイル形式に対応するには:
 * 1. src/parsers/ に FileParser を実装するモジュールを作成
 * 2. lib/registry.ts の parsers 配列に登録
 */
export interface FileParser {
  /** このパーサーが対応する拡張子（例: [".geojson", ".json"]） */
  extensions: string[];
  /** ファイルを読み込み・解析して ParseResult を返す */
  parse(filePath: string): Promise<ParseResult>;
}

/** CLI フラグから構築されるオプション */
export interface CliOptions {
  noMap: boolean;
  width: number;
  height: number;
  /** PropertySchema コンポーネントで表示するプロパティの上限件数 */
  props: number;
}
