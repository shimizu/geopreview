#!/usr/bin/env node
/**
 * CLI エントリポイント。
 *
 * meow でコマンドライン引数を解析し、ファイル拡張子に応じたパーサーを
 * レジストリから取得して、Ink の App コンポーネントに渡す。
 *
 * 使用例:
 *   gi world.geojson
 *   gi ports.geojson --no-map --props 30
 *   gi routes.geojson -w 100 -h 30
 */

import meow from "meow";
import { render } from "ink";
import React from "react";
import App from "./App.js";
import { getParser } from "./lib/registry.js";

const cli = meow(
  `
  Usage
    $ gp <file>

  Options
    --no-map          Hide map preview
    --width, -w       Map width (chars)   Default: terminal width - 4
    --height, -h      Map height (chars)  Default: 24
    --props, -p       Property display limit  Default: 15

  Examples
    $ gp world.geojson
    $ gp ports.geojson --no-map --props 30
`,
  {
    importMeta: import.meta,
    flags: {
      map: {
        type: "boolean",
        default: true,
      },
      width: {
        type: "number",
        shortFlag: "w",
        default: (process.stdout.columns ?? 80) - 4,
      },
      height: {
        type: "number",
        shortFlag: "h",
        default: 24,
      },
      props: {
        type: "number",
        shortFlag: "p",
        default: 15,
      },
    },
  },
);

const filePath = cli.input[0];

if (!filePath) {
  cli.showHelp();
  process.exit(1);
}

// 拡張子からパーサーを解決。未対応の形式の場合はエラーメッセージを表示して終了
let parser;
try {
  parser = getParser(filePath);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}

const options = {
  noMap: !cli.flags.map,
  width: cli.flags.width,
  height: cli.flags.height,
  props: cli.flags.props,
};

render(<App filePath={filePath} parser={parser} options={options} />, {
  exitOnCtrlC: true,
});
