// @ts-check
// Ipezal: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/ipe_forest/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

// a dark, rough bark whose deep furrows spiral (they lean as they climb: the twisted trunk of an old ipê)
const BARK = ['#3a2a22', '#45332a', '#503c31', '#5b4639'];
const FURROW = ['#1f1612', '#281d17'];
const logSide: Painter = (x, y) => {
  const twist = (x + Math.floor(y / 3) + Math.floor(hash(0, y >> 2, 301) * 2)) % 5;
  if (twist === 0 && hash(x, y >> 1, 302) > 0.12) return pick(FURROW, hash(x, y, 303));
  if (hash(x, y, 304) > 0.97) return hex('#8a7a5a'); // a pale lichen fleck
  const base = pick(BARK, blob(x, y, 305, 4) * 0.55 + hash(x, y, 306) * 0.45);
  return twist === 1 ? [base[0] + 12, base[1] + 9, base[2] + 7, 255] as Rgba : base; // the ridge catches the light
};

// the cut end: very dense dark heartwood (ipê is famous for it), thin olive sapwood, tight rings
const logTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 6.8) return pick(BARK, hash(x, y, 311));
  if (r > 5.6) return pick(['#8a7444', '#957d4a'], hash(x, y, 312)); // sapwood
  const ring = Math.floor(r * 1.6 + hash(x, y, 313) * 0.4) % 2 === 0;
  return ring ? hex('#4a2e1c') : pick(['#5e3a22', '#673f25', '#6f4529'], hash(x, y, 314));
};

// the crowns: clusters of trumpet flowers, a lighter throat in each, almost no leaves (an ipê blooms bare), with gaps
const blossom = (palette: string[], throat: string, salt: number): Painter => (x, y) => {
  const v = blob(x, y, salt, 4);
  if (hash(x, y, salt + 1) < 0.08 + (v < 0.25 ? 0.14 : 0)) return CLEAR;
  if (hash(x, y, salt + 2) > 0.975) return hex('#5d7a2e'); // a lone new leaf
  // each flower is a 3 x 3 cell: a light throat in its middle, darker petals around
  const fx = (x + (y >> 2)) % 3, fy = (y + (x >> 2)) % 3;
  if (fx === 1 && fy === 1 && hash(x >> 1, y >> 1, salt + 3) > 0.35) return hex(throat);
  return pick(palette, Math.min(0.99, v * 0.55 + hash(x, y, salt + 4) * 0.45));
};
const PURPLE = ['#7a2f78', '#8f3c8a', '#a64b9c', '#bc5eae', '#d27bc4'];
const YELLOW = ['#b8860c', '#cf9d16', '#e2b425', '#efc83c', '#f8dc5e'];
const WHITE = ['#cfc8d2', '#ddd7df', '#e9e4ea', '#f3f0f4', '#fcfafc'];

// the fallen petals: single petals scattered over a see-through layer (the grass shows between them)
const carpet = (palette: string[], salt: number): Painter => (x, y) => {
  const v = blob(x, y, salt, 4);
  if (hash(x, y, salt + 1) > 0.3 + v * 0.45) return CLEAR;
  if (hash(x, y, salt + 2) > 0.93) return hex(palette[0]); // a petal seen edge-on, darker
  return pick(palette.slice(1), hash(x, y, salt + 3));
};

// Bromélia: a rosette of stiff, arching leaves, striped green and wine, with a red flower spike in its cup
const LEAF = ['#3f6b2c', '#4c7d33', '#5b8f3c'];
const bromeliad: Painter = (x, y) => {
  if (y >= 7 && y <= 11 && Math.abs(x - 7.5) < 1.2) return pick(['#d23a2c', '#e8573a', '#f07a3c'], hash(x, y, 321)); // the spike
  if (y === 6 && Math.abs(x - 7.5) < 0.7) return hex('#f4a23a');
  for (const lean of [-1.15, -0.65, -0.25, 0.25, 0.65, 1.15]) {
    const dy = 15 - y; // height above the ground
    const sx = 7.5 + lean * dy * (1 + dy / 14);
    if (Math.abs(x - sx) < 1.6 - dy / 12 && dy < 11 - Math.abs(lean) * 2.5) {
      return hash(x, y, 322) > 0.7 ? hex('#7a3446') : pick(LEAF, hash(x, y, 323));
    }
  }
  return CLEAR;
};

// the blooming core, hidden in the crown: a dense knot of blossoms of every colour with a warm golden heart
const core: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r < 2.2) return pick(['#f4c440', '#f8d870', '#fbe7a0'], hash(x, y, 331));
  const k = Math.floor(hash(x >> 1, y >> 1, 332) * 3);
  return pick([PURPLE, YELLOW, WHITE][k], hash(x, y, 333) * 0.8 + 0.2);
};

/** Every texture of this biome, by file name (textures/ipe_forest/<name>.png). */
export const IPE_FOREST_ART: Record<string, Painter> = {
  ipe_log_side: logSide,
  ipe_log_top: logTop,
  ipe_blossom_purple: blossom(PURPLE, '#f2c6e6', 340),
  ipe_blossom_yellow: blossom(YELLOW, '#fff3b0', 350),
  ipe_blossom_white: blossom(WHITE, '#f6e7a2', 360),
  petal_carpet_purple: carpet(PURPLE, 370),
  petal_carpet_yellow: carpet(YELLOW, 380),
  petal_carpet_white: carpet(WHITE, 390),
  bromeliad,
  blooming_ipe_core: core,
};
