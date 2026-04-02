# 新しいファイル形式の追加方法

geopreview に新しい地理空間ファイル形式を追加する手順。

## 手順

### 1. パーサーを作成

`src/parsers/` に新しいファイルを作成する。

```typescript
// src/parsers/newformat.ts
import { stat } from "node:fs/promises";
import type { Feature } from "geojson";
import type { FileParser, ParseResult } from "../lib/types.js";
import { buildParseResult } from "../lib/parseUtils.js";

export const newformatParser: FileParser = {
  extensions: [".ext"],

  async parse(filePath: string): Promise<ParseResult> {
    const fileInfo = await stat(filePath);

    // ファイルを読み込み、GeoJSON Feature 配列に変換する
    const allFeatures: Feature[] = [/* ... */];

    // buildParseResult が統計収集・BBox計算・サンプリングを行う
    return buildParseResult(filePath, fileInfo.size, allFeatures);
  },
};
```

**ポイント:**
- ファイル読み込みと Feature への変換だけを実装すればよい
- 統計収集は `buildParseResult()` に任せる（`lib/parseUtils.ts`）
- 大量データの描画用サンプリングも `buildParseResult()` 内で自動的に行われる

### 2. レジストリに登録

`src/lib/registry.ts` にインポートして `parsers` 配列に追加する。

```typescript
import { newformatParser } from "../parsers/newformat.js";

const parsers: FileParser[] = [
  geojsonParser,
  flatgeobufParser,
  geoparquetParser,
  newformatParser,  // 追加
];
```

### 3. テストを追加

`test/parsers/newformat.test.ts` を作成する。

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { newformatParser } from "../../src/parsers/newformat.js";
import type { ParseResult } from "../../src/lib/types.js";

describe("newformatParser", { timeout: 30_000 }, () => {
  let result: ParseResult;

  beforeAll(async () => {
    result = await newformatParser.parse(resolve("test/data/sample.ext"));
  });

  it("featureCount が正しい", () => {
    expect(result.featureCount).toBeGreaterThan(0);
  });

  it("bbox が妥当な範囲", () => {
    const [minLng, minLat, maxLng, maxLat] = result.bbox;
    expect(minLng).toBeGreaterThanOrEqual(-180);
    expect(maxLng).toBeLessThanOrEqual(180);
    expect(minLat).toBeGreaterThanOrEqual(-90);
    expect(maxLat).toBeLessThanOrEqual(90);
  });
});
```

### 4. テストデータを配置

テスト用のファイルを `test/data/` に配置する。

### 5. ビルド・テスト

```bash
npm run build
npm test
```

## 既存パーサーの参考

| パーサー | ファイル | ライブラリ |
|---|---|---|
| GeoJSON | `parsers/geojson.ts` | なし（JSON.parse） |
| FlatGeobuf | `parsers/flatgeobuf.ts` | `flatgeobuf` |
| GeoParquet | `parsers/geoparquet.ts` | `hyparquet` |

最もシンプルな実装例は `parsers/geojson.ts`、バイナリ形式の例は `parsers/flatgeobuf.ts` を参照。
