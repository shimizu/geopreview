/**
 * FlatGeobuf パーサー — .fgb ファイルを解析して ParseResult に変換する。
 *
 * flatgeobuf パッケージの deserialize() を使い、バイナリデータから
 * GeoJSON Feature を逐次取得して統計を収集する。
 *
 * 処理の流れ:
 * 1. ファイルを Buffer として読み込み、Uint8Array に変換
 * 2. deserialize() の AsyncGenerator で Feature をイテレーション
 * 3. 全 Feature を配列に集めて buildParseResult() に渡す
 */

import { readFile, stat } from "node:fs/promises";
import { deserialize } from "flatgeobuf/lib/mjs/geojson.js";
import type { Feature } from "geojson";
import type { FileParser, ParseResult } from "../lib/types.js";
import { buildParseResult } from "../lib/parseUtils.js";

export const flatgeobufParser: FileParser = {
  extensions: [".fgb"],

  async parse(filePath: string): Promise<ParseResult> {
    const [buffer, fileInfo] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const iter = deserialize(bytes);

    const allFeatures: Feature[] = [];
    for await (const feature of iter) {
      allFeatures.push(feature as Feature);
    }

    return buildParseResult(filePath, fileInfo.size, allFeatures);
  },
};
