# geopreview

Geospatial file inspector for the terminal. Displays statistics summary and a Braille-character map preview.

![geopreview screenshot](https://raw.githubusercontent.com/shimizu/geopreview/main/docs/images/screenshot.png)

## Supported Formats

| Format | Extension |
|---|---|
| GeoJSON | `.geojson`, `.json` |
| FlatGeobuf | `.fgb` |
| GeoParquet | `.parquet` |

## Install

```bash
npm install -g geopreview
```

Requires Node.js v18+.

## Usage

```bash
geopreview <file>
```

### Options

| Option | Description | Default |
|---|---|---|
| `--no-map` | Hide map preview | — |
| `--width`, `-w` | Map width (chars) | terminal width - 4 |
| `--height`, `-h` | Map height (chars) | 24 |
| `--props`, `-p` | Property display limit | 15 |

### Examples

```bash
geopreview world.geojson
geopreview countries.fgb --no-map
geopreview buildings.parquet --props 30
geopreview routes.geojson -w 100 -h 30
```

### Keyboard

| Key | Action |
|---|---|
| `q` / `Ctrl+C` | Exit |

## What It Shows

- **Header** — File name, feature count, file size
- **Geometry Summary** — Count per geometry type (Point, Polygon, MultiPolygon, etc.)
- **Property Schema** — Property names, types, and fill rate with visual bar
- **Map Preview** — Braille-character rendering of all geometries

## License

ISC
