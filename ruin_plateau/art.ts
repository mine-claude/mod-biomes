// @ts-check
// Planalto das Ruínas: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one
// to textures/ruin_plateau/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const STONE = ['#6c685e', '#78746a', '#847f73', '#8f8a7c', '#9a9484'];
const STONE_LIGHT = ['#aca594', '#b8b19f'];
const STONE_DARK = ['#57534b', '#4b4841'];
const LICHEN = ['#b9a75a', '#a99b52', '#c4b76e'];
const MOSS = ['#3f5f27', '#4b6e2d', '#587d34', '#668c3b', '#74993f'];
const RUNE = ['#3e4a52', '#46535c', '#4f5d66', '#57656e'];
const shade = (c: Rgba, k: number): Rgba => [Math.max(0, Math.min(255, Math.round(c[0] * k))), Math.max(0, Math.min(255, Math.round(c[1] * k))), Math.max(0, Math.min(255, Math.round(c[2] * k))), c[3]];

// weathered stone: soft horizontal bedding, a few long cracks, pits, and pale lichen specks
const stoneBase = (x: number, y: number, salt: number): Rgba => {
  if (hash(x, y, salt + 1) > 0.965) return pick(LICHEN, hash(x, y, salt + 2));
  if (hash(x, y, salt + 3) > 0.95) return pick(STONE_DARK, hash(x, y, salt + 4)); // a pit
  const bed = Math.floor((y + Math.floor(blob(x, 0, salt + 5, 8) * 2.4)) / 4) % 2; // soft bedding lines
  const v = blob(x, y, salt + 6, 4) * 0.55 + hash(x, y, salt + 7) * 0.45;
  const c = pick(STONE, v);
  return bed ? shade(c, 0.95) : c;
};
// a crack: a crooked line down the tile
const crack = (x: number, y: number, x0: number, salt: number) => {
  const cx = x0 + Math.round((blob(0, y, salt, 4) - 0.5) * 5);
  return x === cx && y >= 2 && y <= 13;
};
const weatheredSide: Painter = (x, y) => {
  if (crack(x, y, 5, 201) || crack(x, y, 12, 202) && y > 7) return hex('#45423b');
  if (y === 0 && hash(x, 0, 203) > 0.5) return pick(STONE_LIGHT, hash(x, y, 204)); // a worn upper edge
  return stoneBase(x, y, 210);
};
const weatheredTop: Painter = (x, y) => {
  if (crack(y, x, 7, 221)) return hex('#4a463f');
  const c = stoneBase(x, y, 230);
  return blob(x, y, 231, 8) > 0.72 ? shade(c, 1.08) : c;
};

// stone moss: a cushion of moss over the stone, little stones peeking through, a few tiny sprigs
const mossTop: Painter = (x, y) => {
  const bare = blob(x, y, 241, 4) > 0.78 && hash(x, y, 242) > 0.3;
  if (bare) return pick(STONE, 0.3 + hash(x, y, 243) * 0.6);
  if (hash(x, y, 244) > 0.93) return hex('#8fae52'); // a bright sprig
  return pick(MOSS, blob(x, y, 245, 4) * 0.6 + hash(x, y, 246) * 0.4);
};
// the side: weathered stone with the moss lip over the top and a few drips running down
const mossSide: Painter = (x, y) => {
  const lip = 2 + Math.floor(blob(x, 0, 251, 4) * 3) + (hash(x, 0, 252) > 0.8 ? 3 : 0);
  if (y < lip) return pick(MOSS, hash(x, y, 253) * 0.8 + (y === lip - 1 ? 0 : 0.2));
  if (y === lip && hash(x, y, 254) > 0.5) return hex('#3a5424');
  return stoneBase(x, y, 260);
};

// column drum, side: vertical flutes (a dark groove every 4 pixels, a light ridge between), chipped here and there, a
// stain of moss at the foot
const drumSide: Painter = (x, y) => {
  const f = x % 4;
  if (hash(x, y, 271) > 0.94) return pick(STONE_DARK, hash(x, y, 272)); // a chip
  if (y >= 13 && blob(x, y, 273, 4) > 0.55) return pick(MOSS, hash(x, y, 274));
  const base = pick(['#8d8778', '#9b9584', '#a8a190', '#b3ac9a'], f === 0 ? 0.05 : f === 2 ? 0.9 : 0.5 + hash(x, y, 275) * 0.2);
  return f === 0 ? shade(base, 0.7) : shade(base, 0.94 + hash(x, y, 276) * 0.1);
};
// column drum, top: the cut face, a smooth ring at the rim, a rough centre and the square dowel hole in the middle
const drumTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy);
  if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) return hex('#3c3a35'); // the dowel hole
  if (r > 6.6) return pick(['#8d8778', '#9b9584'], hash(x, y, 281));
  if (r > 5.2) return pick(STONE_LIGHT, hash(x, y, 282)); // the smooth band
  if (Math.abs(r - 3.4) < 0.5 && hash(x, y, 283) > 0.4) return hex('#77716a');
  return pick(STONE, 0.4 + hash(x, y, 284) * 0.6);
};
// a drum lying on its side: the worn shaft, flutes rubbed away to long faint lines, cracks along it
const drumWorn: Painter = (x, y) => {
  if (y % 4 === 0 && hash(x >> 2, y, 291) > 0.35) return shade(hex('#8d8778'), 0.82);
  if (hash(x, y, 292) > 0.95) return pick(STONE_DARK, hash(x, y, 293));
  if (blob(x, y, 294, 8) > 0.74) return pick(MOSS, hash(x, y, 295));
  return pick(['#8d8778', '#9b9584', '#a8a190', '#b3ac9a'], 0.2 + blob(x, y, 296, 4) * 0.5 + hash(x, y, 297) * 0.3);
};

// column capital, side: the square slab on top, two scrolls (spirals) at the corners under it, a bead line, and the
// fluted neck below
const capitalSide: Painter = (x, y) => {
  if (y <= 3) return y === 3 ? hex('#6e695f') : pick(STONE_LIGHT, hash(x, y, 301) * 0.7 + (y === 0 ? 0.3 : 0));
  if (y <= 9) {
    for (const cx of [3, 12]) {
      const dx = x - cx, dy = y - 6.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      // a spiral: dark where the groove of the scroll runs (radius grows with the angle)
      if (r < 3.2) {
        const turn = (a / (2 * Math.PI) + 1) % 1;
        const groove = Math.abs(((r - turn * 1.4) % 1.4 + 1.4) % 1.4 - 0.7) < 0.35;
        return groove ? hex('#5d584f') : pick(STONE_LIGHT, hash(x, y, 302));
      }
    }
    if (y === 9) return (x % 2 ? hex('#a8a190') : hex('#77716a')); // the bead line
    return pick(['#9b9584', '#a8a190'], hash(x, y, 303));
  }
  return drumSide(x, y);
};
const capitalTop: Painter = (x, y) => {
  if (x === 0 || y === 0 || x === 15 || y === 15) return hex('#77716a');
  if (x === 1 || y === 1 || x === 14 || y === 14) return pick(STONE_LIGHT, hash(x, y, 311));
  return pick(STONE, 0.45 + hash(x, y, 312) * 0.55);
};

// rune stone: a dark blue-grey stone with the carved channels of a glyph (the glyph's own light is the overlay below)
const glyphCell = (x: number, y: number) => {
  // an original glyph: a stem, a ring around its middle, two arms rising and a hook at the foot
  const stem = x === 7 && y >= 2 && y <= 13;
  const ring = Math.abs(Math.hypot(x - 7, y - 7) - 3) < 0.55;
  const armL = y >= 2 && y <= 5 && x === 7 - (5 - y) - 1 && x >= 3;
  const armR = y >= 2 && y <= 5 && x === 7 + (5 - y) + 1 && x <= 11;
  const hook = (y === 13 && x >= 7 && x <= 10) || (x === 10 && y === 12);
  const dots = (x === 3 && y === 11) || (x === 11 && y === 11);
  return stem || ring || armL || armR || hook || dots;
};
const runeSide: Painter = (x, y) => {
  if (glyphCell(x, y)) return hex('#263037'); // the carved channel
  if (hash(x, y, 321) > 0.95) return pick(LICHEN, hash(x, y, 322));
  if (x === 0 || x === 15) return shade(pick(RUNE, hash(x, y, 323)), 0.85);
  return pick(RUNE, blob(x, y, 324, 4) * 0.5 + hash(x, y, 325) * 0.5);
};
const runeTop: Painter = (x, y) => {
  if (hash(x, y, 331) > 0.96) return pick(LICHEN, hash(x, y, 332));
  if (blob(x, y, 333, 8) > 0.75) return pick(MOSS, hash(x, y, 334));
  return pick(RUNE, blob(x, y, 335, 4) * 0.5 + hash(x, y, 336) * 0.5);
};
// the glow of the glyph: only its strokes (a faint teal), everything else clear; drawn emissive just off the faces
const runeGlyph: Painter = (x, y) => {
  if (!glyphCell(x, y)) return CLEAR;
  return hash(x, y, 341) > 0.8 ? hex('#7fd6c4') : hex('#4fae9e');
};

/** Every texture of this biome, by file name (textures/ruin_plateau/<name>.png). */
export const RUIN_PLATEAU_ART: Record<string, Painter> = {
  weathered_stone_side: weatheredSide,
  weathered_stone_top: weatheredTop,
  stone_moss_top: mossTop,
  stone_moss_side: mossSide,
  column_drum_side: drumSide,
  column_drum_top: drumTop,
  column_drum_worn: drumWorn,
  column_capital_side: capitalSide,
  column_capital_top: capitalTop,
  rune_stone_side: runeSide,
  rune_stone_top: runeTop,
  rune_stone_glyph: runeGlyph,
};
