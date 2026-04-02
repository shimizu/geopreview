#!/usr/bin/env node
import meow from "meow";
import { render } from "ink";
import React from "react";
import App from "./App.js";

const cli = meow(
  `
  Usage
    $ geojson-inspect <file>

  Options
    --no-map          Hide map preview
    --width, -w       Map width (chars)   Default: terminal width - 4
    --height, -h      Map height (chars)  Default: 24
    --props, -p       Property display limit  Default: 15

  Examples
    $ geojson-inspect world.geojson
    $ geojson-inspect ports.geojson --no-map --props 30
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

const options = {
  noMap: !cli.flags.map,
  width: cli.flags.width,
  height: cli.flags.height,
  props: cli.flags.props,
};

render(<App filePath={filePath} options={options} />, {
  exitOnCtrlC: true,
});
