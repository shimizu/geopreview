# geojson-inspect — 仕様書

## 概要

GeoJSON ファイルを受け取り、**統計サマリー** と **ターミナル上の簡易ビジュアライズ** を表示する CLI ツール。
React Ink でインタラクティブな UI を構成し、drawille-canvas でジオメトリを描画する。

---

## 技術スタック

| 役割 | ライブラリ |
|---|---|
| ターミナル UI フレームワーク | `ink` v5 |
| UI コンポーネント集 | `@inkjs/ui` |
| ターミナル描画（ブライユ文字） | `drawille-canvas` |
| GeoJSON 型定義 | `@types/geojson` |
| 引数パース | `meow` |
| ファイル読み込み | Node.js `fs/promises` |
| 言語 | TypeScript |

---

## インストール・起動

```bash
npm install -g geojson-inspect

# 基本
geojson-inspect ./data/ports.geojson

# オプション
geojson-inspect ./data/ports.geojson --no-map      # マップ非表示
geojson-inspect ./data/ports.geojson --width 120   # マップ幅指定（文字数）
geojson-inspect ./data/ports.geojson --height 40   # マップ高さ指定（文字数）
geojson-inspect ./data/ports.geojson --props 20    # プロパティ表示件数上限
```

---

## 画面レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│  📄 ports.geojson                                           │
│  FeatureCollection  /  1,842 features  /  23.4 MB           │
├──────────────────────────┬──────────────────────────────────┤
│  GEOMETRY SUMMARY        │  PROPERTY SCHEMA                 │
│  ─────────────────────── │  ────────────────────────────── │
│  Point          1,712    │  name        string  (1842/1842) │
│  LineString        80    │  country     string  (1842/1842) │
│  Polygon           50    │  capacity    number  (1200/1842) │
│                          │  updated_at  string   (980/1842) │
│                          │  tags        array    (320/1842) │
├──────────────────────────┴──────────────────────────────────┤
│  MAP PREVIEW (drawille)                                     │
│  ⠀⠀⠀⠀⡠⢤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀  │
│  ⠀⠀⠀⠔⠀⠀⠈⠢⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀  │
│  ⠀⡠⠊⠀⠀⠀⠀⠀⠈⠢⡀⠀⠀⠀⠀⡠⠤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀  │
│  ...                                                        │
│                                         [q: 終了]           │
└─────────────────────────────────────────────────────────────┘
```

---

## コンポーネント構成

```
src/
├── cli.ts                  # エントリポイント (meow でフラグ解析 → render)
├── App.tsx                 # ルートコンポーネント
├── components/
│   ├── Header.tsx          # ファイル名・サイズ・種別
│   ├── GeometrySummary.tsx # ジオメトリ種別カウント表
│   ├── PropertySchema.tsx  # プロパティ名・型・充足率
│   ├── MapPreview.tsx      # drawille-canvas 描画 + <Text>
│   └── Footer.tsx          # キーバインドヒント
├── lib/
│   ├── parseGeojson.ts     # 解析ロジック
│   ├── drawMap.ts          # drawille-canvas 描画ロジック
│   └── types.ts            # 共通型定義
└── hooks/
    └── useGeojson.ts       # ファイル読み込み + 解析の非同期フック
```

---

## データフロー

```
GeoJSON ファイル
    │
    ▼
parseGeojson.ts
    │  FeatureCollection を走査
    │  - ジオメトリ種別カウント
    │  - プロパティ全キー収集
    │  - 各キーの型推定 & 充足率計算
    │  - 座標 BBox 計算
    ▼
ParseResult (型定義は後述)
    │
    ├──▶ GeometrySummary.tsx  (統計表示)
    ├──▶ PropertySchema.tsx   (スキーマ表示)
    └──▶ drawMap.ts
              │  BBox → ターミナルサイズに正規化
              │  各 Feature のジオメトリを drawille-canvas で描画
              │  frame() でブライユ文字列を取得
              ▼
         MapPreview.tsx (<Text> でレンダリング)
```

---

## 型定義 (`lib/types.ts`)

```typescript
export type GeometryType =
  | 'Point' | 'MultiPoint'
  | 'LineString' | 'MultiLineString'
  | 'Polygon' | 'MultiPolygon'
  | 'GeometryCollection';

export type PropertyType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

export interface PropertyStat {
  key: string;
  types: Set<PropertyType>;   // 複数型混在を許容
  count: number;              // 値が存在する Feature 数
  total: number;              // 全 Feature 数
}

export interface ParseResult {
  filePath: string;
  fileSizeBytes: number;
  featureCount: number;
  geometryCounts: Record<GeometryType, number>;
  propertyStats: PropertyStat[];
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  features: GeoJSON.Feature[];            // 描画用に保持（巨大ファイルは間引き）
}
```

---

## 解析ロジック (`lib/parseGeojson.ts`)

### 処理仕様

1. `fs/promises.readFile` でファイルを読み込み `JSON.parse`
2. ルートの `type` が `FeatureCollection` / `Feature` / ジオメトリ単体に対応
3. Feature 配列を 1 パスで走査し以下を収集:
   - ジオメトリ種別カウント（`GeometryCollection` は再帰）
   - プロパティ全キーと型 (`typeof` + `Array.isArray` で判定)
   - 全座標から BBox を更新
4. **大容量ファイル対応**: Feature 数が 10,000 件超の場合、描画用 features は等間隔サンプリングで最大 5,000 件に間引く。統計は全件で行う。
5. `parseFloat` / `isNaN` を使わず、`typeof value === 'number'` で数値判定

### エラーハンドリング

| 状況 | 挙動 |
|---|---|
| ファイルが存在しない | `Error: File not found` を表示して終了 |
| JSON パースエラー | 行番号付きエラーメッセージを表示して終了 |
| GeoJSON 形式不正 | 警告を出しつつ解析可能な範囲で続行 |
| 空の FeatureCollection | "0 features" として正常表示 |

---

## 描画ロジック (`lib/drawMap.ts`)

### 座標変換

```
ターミナル幅 W 文字 = W×2 drawille ピクセル（横）
ターミナル高 H 文字 = H×4 drawille ピクセル（縦）

lng → px = (lng - bbox.minLng) / (bbox.maxLng - bbox.minLng) * (W×2 - 1)
lat → py = (1 - (lat - bbox.minLat) / (bbox.maxLat - bbox.minLat)) * (H×4 - 1)
           ↑ 上下反転（ターミナルは Y が下向き）
```

### ジオメトリ種別ごとの描画戦略

| 種別 | 描画方法 |
|---|---|
| Point / MultiPoint | `canvas.set(px, py)` で 1 点 |
| LineString / MultiLineString | 頂点間を `ctx.moveTo / lineTo / stroke` |
| Polygon / MultiPolygon | 外周リングを `moveTo / lineTo / closePath / stroke`（塗りつぶしなし） |
| GeometryCollection | 含まれるジオメトリを再帰処理 |

### アスペクト比補正

ターミナルの文字セルは縦長（おおよそ 1:2）のため、緯度方向を `× 0.5` に補正してアスペクト比を調整する。

### BBox が点または線（面積ゼロ）の場合

`minLng === maxLng` または `minLat === maxLat` の場合、それぞれ ±0.001 のパディングを追加してゼロ除算を防ぐ。

---

## コンポーネント詳細

### `App.tsx`

```tsx
const App: FC<{ filePath: string; options: CliOptions }> = ({ filePath, options }) => {
  const { result, loading, error } = useGeojson(filePath);
  const { exit } = useApp();

  useInput((input) => { if (input === 'q') exit(); });

  if (loading) return <Spinner label="Loading..." />;
  if (error)   return <Text color="red">{error.message}</Text>;

  return (
    <Box flexDirection="column">
      <Header result={result} filePath={filePath} />
      <Box>
        <GeometrySummary counts={result.geometryCounts} />
        <PropertySchema stats={result.propertyStats} limit={options.props} />
      </Box>
      {!options.noMap && (
        <MapPreview result={result} width={options.width} height={options.height} />
      )}
      <Footer />
    </Box>
  );
};
```

### `MapPreview.tsx`

- `useEffect` 内で `drawMap(result, width, height)` を呼び出し、返ってきたブライユ文字列を `useState` で保持
- `<Text>` でそのまま出力（フォントによる幅ズレを避けるため `wrap="truncate"` は使わない）
- `result` または `width/height` が変わるたびに再描画

### `PropertySchema.tsx`

- `props` オプションで表示件数を絞る（デフォルト 15 件）
- 充足率を `▓` / `░` のバーで視覚化（10 段階、幅 10 文字）
- 型が複数混在する場合は `string|number` のように `|` 区切りで表示

---

## CLI フラグ仕様

```
Usage
  $ geojson-inspect <file>

Options
  --no-map          マッププレビューを非表示
  --width, -w       マップ幅（文字数）  デフォルト: ターミナル幅 - 4
  --height, -h      マップ高さ（文字数）デフォルト: 24
  --props, -p       プロパティ表示上限  デフォルト: 15
  --version         バージョン表示
  --help            ヘルプ表示

Examples
  $ geojson-inspect world.geojson
  $ geojson-inspect ports.geojson --no-map --props 30
  $ geojson-inspect routes.geojson -w 100 -h 30
```

---

## キーバインド

| キー | 動作 |
|---|---|
| `q` / `Ctrl+C` | 終了 |

---

## 非機能要件

| 項目 | 目標値 |
|---|---|
| 起動〜初期表示 | 10 MB の GeoJSON で 2 秒以内 |
| メモリ使用量 | 100 MB の GeoJSON でも 500 MB 未満 |
| 対応ターミナル | iTerm2, kitty, Warp, VS Code Terminal, macOS Terminal |
| Node.js バージョン | v18 以上 |

---

## 実装順序（推奨）

1. `parseGeojson.ts` と `types.ts` を実装・単体テスト
2. `drawMap.ts` を実装（Ink なしで文字列出力確認）
3. `Header` / `GeometrySummary` / `PropertySchema` をスタイルなしで実装
4. `MapPreview` を追加して drawille 出力を Ink に統合
5. `useGeojson` フックで非同期ローディング・エラー処理
6. `cli.ts` で meow 統合・オプション接続
7. 大容量ファイル・エッジケースのテスト