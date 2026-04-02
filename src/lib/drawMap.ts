/**
 * drawille-canvas を使ってジオメトリをブライユ文字（Unicode Braille）で描画する。
 *
 * ブライユ文字は 1 文字あたり 2×4 のドットマトリクスを持つため、
 * ターミナルの 1 文字が 2px（横）× 4px（縦）の解像度になる。
 *
 * 座標変換:
 *   経度(lng) → px = (lng - minLng) / lngRange * (幅px - 1)
 *   緯度(lat) → py = (1 - (lat - minLat) / latRange) * (高さpx - 1)
 *                     ↑ Y軸反転（ターミナルは上から下、緯度は南から北）
 *
 * 描画方針: ストロークのみ（塗りつぶしなし）で輪郭を描く。
 */

// @ts-expect-error drawille-canvas has no type declarations
import DrawilleCanvas from "drawille-canvas";
import type { Geometry, Position } from "geojson";
import type { ParseResult } from "./types.js";

/** drawille-canvas の Context が提供する描画メソッドの型定義 */
interface DrawContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  /** ブライユ文字列を返す */
  toString(): string;
}

/**
 * ParseResult の features を drawille キャンバスに描画し、ブライユ文字列を返す。
 *
 * @param widthChars  - マップの幅（ターミナル文字数）
 * @param heightChars - マップの高さ（ターミナル文字数）
 */
export function drawMap(
  result: ParseResult,
  widthChars: number,
  heightChars: number,
): string {
  // ブライユ1文字 = 横2ドット × 縦4ドット
  const pxW = widthChars * 2;
  const pxH = heightChars * 4;

  const ctx: DrawContext = new DrawilleCanvas(pxW, pxH);
  const [minLng, minLat, maxLng, maxLat] = result.bbox;

  const lngRange = maxLng - minLng;
  const latRange = maxLat - minLat;

  /** 経度をピクセルX座標に変換 */
  function projectLng(lng: number): number {
    return ((lng - minLng) / lngRange) * (pxW - 1);
  }

  /** 緯度をピクセルY座標に変換（Y軸反転） */
  function projectLat(lat: number): number {
    return (1 - (lat - minLat) / latRange) * (pxH - 1);
  }

  /** Point 用: 1ピクセルの点を打つ */
  function drawCoord(coord: Position): void {
    const px = Math.round(projectLng(coord[0]));
    const py = Math.round(projectLat(coord[1]));
    ctx.fillRect(px, py, 1, 1);
  }

  /** LineString 用: 頂点間を線分で結ぶ */
  function drawLineString(coords: Position[]): void {
    if (coords.length === 0) return;
    ctx.beginPath();
    const x0 = Math.round(projectLng(coords[0][0]));
    const y0 = Math.round(projectLat(coords[0][1]));
    ctx.moveTo(x0, y0);
    for (let i = 1; i < coords.length; i++) {
      const x = Math.round(projectLng(coords[i][0]));
      const y = Math.round(projectLat(coords[i][1]));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /** Polygon 用: 各リング（外周・穴）の輪郭を描画（塗りつぶしなし） */
  function drawPolygon(rings: Position[][]): void {
    for (const ring of rings) {
      if (ring.length === 0) continue;
      ctx.beginPath();
      const x0 = Math.round(projectLng(ring[0][0]));
      const y0 = Math.round(projectLat(ring[0][1]));
      ctx.moveTo(x0, y0);
      for (let i = 1; i < ring.length; i++) {
        const x = Math.round(projectLng(ring[i][0]));
        const y = Math.round(projectLat(ring[i][1]));
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  /** ジオメトリ種別に応じて描画関数を振り分ける（GeometryCollection は再帰） */
  function drawGeometry(geometry: Geometry): void {
    switch (geometry.type) {
      case "Point":
        drawCoord(geometry.coordinates);
        break;
      case "MultiPoint":
        for (const coord of geometry.coordinates) drawCoord(coord);
        break;
      case "LineString":
        drawLineString(geometry.coordinates);
        break;
      case "MultiLineString":
        for (const line of geometry.coordinates) drawLineString(line);
        break;
      case "Polygon":
        drawPolygon(geometry.coordinates);
        break;
      case "MultiPolygon":
        for (const polygon of geometry.coordinates) drawPolygon(polygon);
        break;
      case "GeometryCollection":
        for (const g of geometry.geometries) drawGeometry(g);
        break;
    }
  }

  for (const feature of result.features) {
    if (feature.geometry) {
      drawGeometry(feature.geometry);
    }
  }

  return ctx.toString();
}
