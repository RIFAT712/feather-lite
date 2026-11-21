import fs from "fs/promises";
import path from "path";
import * as hb from "harfbuzzjs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const opentype = require("opentype.js");

export type ShapedLine = {
  path: string;
  width: number;
  height: number;
};

let cachedHbFont: hb.Font | null = null;
let cachedOtFont: any = null;

async function getFonts() {
  if (cachedHbFont && cachedOtFont) {
    return { hbFont: cachedHbFont, otFont: cachedOtFont };
  }
  const fontPath = path.join(process.cwd(), "public/fonts/NotoSansBengali.ttf");
  const fontBuf = await fs.readFile(fontPath);
  
  const blob = new hb.Blob(fontBuf);
  const face = new hb.Face(blob, 0);
  cachedHbFont = new hb.Font(face);
  
  const arrayBuf = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
  cachedOtFont = opentype.parse(arrayBuf);
  
  return { hbFont: cachedHbFont, otFont: cachedOtFont };
}

function serializePathCommands(commands: any[]): string {
  let str = "";
  for (const cmd of commands) {
    if (cmd.type === "M") {
      str += `M${cmd.x.toFixed(1)} ${cmd.y.toFixed(1)}`;
    } else if (cmd.type === "L") {
      str += `L${cmd.x.toFixed(1)} ${cmd.y.toFixed(1)}`;
    } else if (cmd.type === "Q") {
      str += `Q${cmd.x1.toFixed(1)} ${cmd.y1.toFixed(1)} ${cmd.x.toFixed(1)} ${cmd.y.toFixed(1)}`;
    } else if (cmd.type === "C") {
      str += `C${cmd.x1.toFixed(1)} ${cmd.y1.toFixed(1)} ${cmd.x2.toFixed(1)} ${cmd.y2.toFixed(1)} ${cmd.x.toFixed(1)} ${cmd.y.toFixed(1)}`;
    } else if (cmd.type === "Z") {
      str += "Z";
    }
  }
  return str;
}

export async function shapeLineToSvg(text: string, fontSize: number): Promise<ShapedLine> {
  const clean = text.trim();
  if (!clean) return { path: "", width: 0, height: Math.ceil(fontSize * 1.3) };
  try {
    const { hbFont, otFont } = await getFonts();
    const buffer = new hb.Buffer();
    buffer.addText(clean);
    buffer.guessSegmentProperties();
    hb.shape(hbFont, buffer);
    const glyphs = buffer.getGlyphInfosAndPositions();
    
    const scale = fontSize / otFont.unitsPerEm;
    let x = 0;
    let fullPath = "";
    
    for (const g of glyphs) {
      const glyph = otFont.glyphs.get(g.codepoint);
      if (glyph) {
        const xOffset = g.xOffset ?? 0;
        const yOffset = g.yOffset ?? 0;
        const gx = x + xOffset * scale;
        const gy = fontSize - yOffset * scale;
        const p = glyph.getPath(gx, gy, fontSize);
        fullPath += serializePathCommands(p.commands) + " ";
      }
      x += (g.xAdvance ?? 0) * scale;
    }
    return {
      path: fullPath.trim(),
      width: Math.ceil(x),
      height: Math.ceil(fontSize * 1.3),
    };
  } catch (err) {
    console.error("[svg-shaper] Shaping failed:", err);
    return { path: "", width: 0, height: Math.ceil(fontSize * 1.3) };
  }
}

export async function shapeParagraphToSvg(
  text: string,
  fontSize: number,
  maxWidth: number,
  maxLines: number = 2
): Promise<ShapedLine[]> {
  const clean = text.replace(/[\r\n\t]+/g, " ").trim();
  if (!clean) return [];
  
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    const test = await shapeLineToSvg(next, fontSize);
    if (test.width > maxWidth && current) {
      lines.push(current);
      current = w;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  
  const results: ShapedLine[] = [];
  for (const l of lines) {
    results.push(await shapeLineToSvg(l, fontSize));
  }
  return results;
}
