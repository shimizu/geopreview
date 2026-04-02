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
 * 2. Feature 配列を抽出し、buildParseResult() で統計収集・BBox計算・サンプリングを実行
 */

import { readFile, stat } from "node:fs/promises";
import type { Feature, FeatureCollection, GeoJSON, Geometry } from "geojson";
import type { FileParser, ParseResult } from "../lib/types.js";
import { buildParseResult } from "../lib/parseUtils.js";

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

export const geojsonParser: FileParser = {
  extensions: [".geojson", ".json"],

  async parse(filePath: string): Promise<ParseResult> {
    const [content, fileInfo] = await Promise.all([
      readFile(filePath, "utf-8"),
      stat(filePath),
    ]);

    const geojson: GeoJSON = JSON.parse(content);
    const allFeatures = toFeatures(geojson);

    return buildParseResult(filePath, fileInfo.size, allFeatures);
  },
};
