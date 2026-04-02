/**
 * パーサーレジストリ — ファイルの拡張子に基づいて適切なパーサーを解決する。
 *
 * 新しいファイル形式を追加する場合:
 * 1. src/parsers/ に FileParser 実装を作成
 * 2. この parsers 配列にインポートして追加する
 *
 * 例: import { shapefileParser } from "../parsers/shapefile.js";
 *     const parsers: FileParser[] = [geojsonParser, shapefileParser];
 */

import { extname } from "node:path";
import type { FileParser } from "./types.js";
import { geojsonParser } from "../parsers/geojson.js";

/** 登録済みパーサー一覧。先頭から順に拡張子マッチを試みる */
const parsers: FileParser[] = [geojsonParser];

/**
 * ファイルパスの拡張子から対応するパーサーを返す。
 * 該当なしの場合は対応形式を列挙したエラーを投げる。
 */
export function getParser(filePath: string): FileParser {
  const ext = extname(filePath).toLowerCase();
  const parser = parsers.find((p) => p.extensions.includes(ext));
  if (!parser) {
    const supported = parsers.flatMap((p) => p.extensions).join(", ");
    throw new Error(`Unsupported file type: ${ext}\nSupported: ${supported}`);
  }
  return parser;
}

/** 実行時にパーサーを動的に追加する場合に使用 */
export function registerParser(parser: FileParser): void {
  parsers.push(parser);
}
