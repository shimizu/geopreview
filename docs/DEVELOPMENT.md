# 開発ガイド

## 環境構築

```bash
git clone https://github.com/shimizu/geopreview.git
cd geopreview
npm install
```

**必要環境:** Node.js v18+

## 開発コマンド

| コマンド | 説明 |
|---|---|
| `npm run build` | TypeScript コンパイル（`dist/` に出力） |
| `npm test` | vitest でテスト実行 |
| `npm start -- <file>` | tsx で直接実行（ビルド不要） |
| `npx vitest run test/lib/parseUtils.test.ts` | 単一テストファイルの実行 |
| `npx vitest --watch` | ウォッチモード |

## ディレクトリ構成

```
src/
├── cli.tsx                  # エントリポイント（meow で引数解析 → Ink render）
├── App.tsx                  # ルートコンポーネント（子コンポーネントの組み立て）
├── lib/
│   ├── types.ts             # 共通型定義（ParseResult, FileParser 等）
│   ├── registry.ts          # 拡張子ベースのパーサーレジストリ
│   ├── parseUtils.ts        # 統計収集の共通ユーティリティ
│   └── drawMap.ts           # drawille-canvas によるブライユ文字描画
├── parsers/
│   ├── geojson.ts           # GeoJSON パーサー
│   ├── flatgeobuf.ts        # FlatGeobuf パーサー
│   └── geoparquet.ts        # GeoParquet パーサー
├── hooks/
│   └── useFileParser.ts     # ファイル読み込み・解析の非同期フック
└── components/
    ├── Header.tsx            # ファイル名・Feature数・サイズ
    ├── GeometrySummary.tsx   # ジオメトリ種別カウント
    ├── PropertySchema.tsx    # プロパティ名・型・充足率
    ├── MapPreview.tsx        # ブライユ文字マップ
    └── Footer.tsx            # キーバインドヒント

test/
├── data/                    # テスト用データファイル
├── lib/                     # lib/ の単体テスト
└── parsers/                 # パーサー統合テスト + クロスフォーマットテスト
```

## アーキテクチャ

### データフロー

```
ファイル (.geojson / .fgb / .parquet)
  → cli.tsx: 拡張子からパーサーを取得 (registry.ts)
  → App.tsx: useFileParser フックで非同期解析
  → parser.parse(): ファイル読み込み → Feature 配列 → buildParseResult()
  → ParseResult を各 UI コンポーネントに分配
  → drawMap.ts: Feature の座標をブライユ文字に変換
```

### 核心の型: ParseResult

すべてのパーサーと UI コンポーネントは `ParseResult` を介して接続されている。
新しいファイル形式を追加する場合も、`ParseResult` を返すようにすれば UI 側の変更は不要。

### パーサーレジストリパターン

`registry.ts` が拡張子からパーサーを解決する。各パーサーは `FileParser` インターフェースを実装する。

```typescript
interface FileParser {
  extensions: string[];
  parse(filePath: string): Promise<ParseResult>;
}
```
