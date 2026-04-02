/**
 * GeoParquet パーサー — .parquet ファイルを解析して ParseResult に変換する。
 *
 * hyparquet パッケージを使用し、Parquet バイナリから行オブジェクトを読み出す。
 * GeoParquet メタデータが存在する場合、ジオメトリカラム（通常 "geometry"）の
 * WKB は hyparquet が自動的に GeoJSON ジオメトリにデコードする。
 *
 * 処理の流れ:
 * 1. asyncBufferFromFile() でファイルを AsyncBuffer として開く
 * 2. parquetMetadataAsync() でメタデータを読み、ジオメトリカラム名を特定
 * 3. parquetReadObjects() で全行をオブジェクト配列として取得
 * 4. 各行から geometry を取り出して Feature に組み立て、buildParseResult() に渡す
 */

import { stat } from "node:fs/promises";
import {
  asyncBufferFromFile,
  parquetMetadataAsync,
  parquetReadObjects,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";
import type { Feature, Geometry } from "geojson";
import type { FileParser, ParseResult } from "../lib/types.js";
import { buildParseResult } from "../lib/parseUtils.js";

/**
 * Parquet の geo メタデータから主ジオメトリカラム名を取得する。
 * geo メタデータがない場合は "geometry" をデフォルトとする。
 */
function getGeometryColumnName(
  kvList: Array<{ key: string; value?: string }> | undefined,
): string {
  const geoEntry = kvList?.find((kv) => kv.key === "geo");
  if (geoEntry?.value) {
    try {
      const parsed = JSON.parse(geoEntry.value);
      if (parsed.primary_column) return parsed.primary_column;
    } catch {
      // パース失敗時はデフォルトにフォールバック
    }
  }
  return "geometry";
}

/** ジオメトリやメタデータ用のカラムを除いたプロパティを抽出する */
function extractProperties(
  row: Record<string, unknown>,
  geometryColumn: string,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    // ジオメトリカラムと bbox 補助カラムを除外
    if (key === geometryColumn || key === `${geometryColumn}_bbox`) continue;
    props[key] = value;
  }
  return props;
}

export const geoparquetParser: FileParser = {
  extensions: [".parquet"],

  async parse(filePath: string): Promise<ParseResult> {
    const [file, fileInfo] = await Promise.all([
      asyncBufferFromFile(filePath),
      stat(filePath),
    ]);

    // メタデータからジオメトリカラム名を取得
    const metadata = await parquetMetadataAsync(file);
    const geometryColumn = getGeometryColumnName(
      metadata.key_value_metadata,
    );

    // 全行をオブジェクト配列として読み込み（hyparquet が WKB→GeoJSON を自動デコード）
    const rows = await parquetReadObjects({
      file,
      compressors,
      metadata,
    });

    const allFeatures: Feature[] = rows.map((row) => ({
      type: "Feature",
      geometry: row[geometryColumn] as Geometry,
      properties: extractProperties(row, geometryColumn),
    }));

    return buildParseResult(filePath, fileInfo.size, allFeatures);
  },
};
