# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

geopreview (`gp`) — 地理空間ファイルの統計サマリーとブライユ文字によるターミナルマッププレビューを表示する CLI ツール。
GeoJSON (.geojson/.json), FlatGeobuf (.fgb), GeoParquet (.parquet) に対応。

## 技術スタック

- TypeScript + React Ink v5（ターミナル UI）
- drawille-canvas（ブライユ文字描画）
- meow（CLI 引数パース）
- flatgeobuf / hyparquet（バイナリ形式パーサー）
- Node.js v18+

## ビルド・実行・テスト

```bash
npm install
npm run build          # TypeScript コンパイル
npm test               # vitest でテスト実行
npx tsx src/cli.tsx <file>  # 開発時の直接実行
```

## アーキテクチャ

データフロー: ファイル → レジストリで拡張子からパーサー選択 → `ParseResult` → 各UIコンポーネント + `drawMap.ts`

- `src/cli.tsx` — エントリポイント。meow でフラグ解析、レジストリからパーサー取得後 Ink render
- `src/App.tsx` — ルートコンポーネント。useFileParser フックで非同期読み込み
- `src/lib/registry.ts` — 拡張子ベースのパーサーレジストリ
- `src/lib/parseUtils.ts` — 統計収集の共通ユーティリティ（buildParseResult 等）
- `src/lib/drawMap.ts` — 座標を drawille ピクセルに変換して描画
- `src/parsers/` — 各ファイル形式の FileParser 実装（geojson, flatgeobuf, geoparquet）

新しいファイル形式を追加するには: `src/parsers/` に FileParser を実装し `registry.ts` に登録する。

## コミットプレフィックス

feat / fix / docs / refactor / perf / test / chore / style
