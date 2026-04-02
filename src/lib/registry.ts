import { extname } from "node:path";
import type { FileParser } from "./types.js";
import { geojsonParser } from "../parsers/geojson.js";

const parsers: FileParser[] = [geojsonParser];

export function getParser(filePath: string): FileParser {
  const ext = extname(filePath).toLowerCase();
  const parser = parsers.find((p) => p.extensions.includes(ext));
  if (!parser) {
    const supported = parsers.flatMap((p) => p.extensions).join(", ");
    throw new Error(`Unsupported file type: ${ext}\nSupported: ${supported}`);
  }
  return parser;
}

export function registerParser(parser: FileParser): void {
  parsers.push(parser);
}
