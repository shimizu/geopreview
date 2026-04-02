# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

GeoJSON ファイルの統計サマリーとブライユ文字によるターミナルマッププレビューを表示する CLI ツール。
仕様は `plan.md` に記載。

## 技術スタック

- TypeScript + React Ink v5（ターミナル UI）
- drawille-canvas（ブライユ文字描画）
- meow（CLI 引数パース）
- Node.js v18+

## ビルド・実行

```bash
npm install
npm run build          # TypeScript コンパイル
npm start -- <file>    # 実行
npx tsx src/cli.ts <file>  # 開発時の直接実行
```

## アーキテクチャ

データフロー: GeoJSON ファイル → `parseGeojson.ts`（解析） → `ParseResult` → 各UIコンポーネント + `drawMap.ts`（描画）

- `src/cli.ts` — エントリポイント。meow でフラグ解析後 Ink の render を呼ぶ
- `src/App.tsx` — ルートコンポーネント。useGeojson フックで非同期読み込みし、子コンポーネントへ分配
- `src/lib/parseGeojson.ts` — GeoJSON 解析の中核。1パスで全統計を収集。10,000件超は描画用に間引き
- `src/lib/drawMap.ts` — 座標を drawille ピクセルに変換して描画。アスペクト比補正あり（縦方向 ×0.5）
- `src/hooks/useGeojson.ts` — ファイル読み込み＋解析の非同期フック

## コミットプレフィックス

feat / fix / docs / refactor / perf / test / chore / style
