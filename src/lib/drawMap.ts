// @ts-expect-error drawille-canvas has no type declarations
import DrawilleCanvas from "drawille-canvas";
import type { Feature, Geometry, Position } from "geojson";
import type { ParseResult } from "./types.js";

interface DrawContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  toString(): string;
}

export function drawMap(
  result: ParseResult,
  widthChars: number,
  heightChars: number,
): string {
  const pxW = widthChars * 2;
  const pxH = heightChars * 4;

  const ctx: DrawContext = new DrawilleCanvas(pxW, pxH);
  const [minLng, minLat, maxLng, maxLat] = result.bbox;

  const lngRange = maxLng - minLng;
  const latRange = maxLat - minLat;

  function projectLng(lng: number): number {
    return ((lng - minLng) / lngRange) * (pxW - 1);
  }

  function projectLat(lat: number): number {
    return (1 - (lat - minLat) / latRange) * (pxH - 1);
  }

  function drawCoord(coord: Position): void {
    const px = Math.round(projectLng(coord[0]));
    const py = Math.round(projectLat(coord[1]));
    ctx.fillRect(px, py, 1, 1);
  }

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
