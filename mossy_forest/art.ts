// @ts-check
// Floresta Musgosa: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/mossy_forest/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter } from '../src/pixel.ts';

const MOSS = ['#2f5a1f', '#3a6b24', '#447a2a', '#4f8a2f', '#5d9a36'];
const MOSS_LIGHT = ['#6fae3c', '#86c04a', '#9ccf5a'];
const SOIL = ['#4a3424', '#553c29', '#5f442e', '#4f3826'];
const BARK = ['#3b2a1c', '#46321f', '#513a24', '#5a4129'];
const RING = ['#8a6a44', '#9a7850', '#a8865a'];

// the moss floor: soft clumps, darker hollows, a few bright tips
const mossTop: Painter = (x, y) => {
  const v = blob(x, y, 11, 4) * 0.7 + hash(x, y, 12) * 0.3;
  if (hash(x, y, 13) > 0.93) return pick(MOSS_LIGHT, hash(x, y, 14));
  return pick(MOSS, v);
};

// the side of the moss floor: soil below, a moss lip on top that hangs in uneven drips
const mossSide: Painter = (x, y) => {
  const lip = 3 + Math.floor(hash(x, 0, 21) * 3) + (hash(x, 1, 22) > 0.8 ? 2 : 0);
  if (y < lip) return y === lip - 1 && hash(x, y, 23) > 0.5 ? pick(MOSS, 0.1) : mossTop(x, y);
  if (hash(x, y, 24) > 0.94) return hex('#6b5a48'); // a pebble
  return pick(SOIL, hash(x, y, 25));
};

// a trunk with ridged bark and moss climbing the faces
const barkSide = (x: number, y: number, salt: number) => {
  const ridge = (x + (hash(0, y >> 2, salt) > 0.5 ? 1 : 0)) % 4 === 0;
  const base = pick(BARK, hash(x, y, salt + 1) * 0.8 + (ridge ? 0 : 0.2));
  return ridge ? [Math.max(0, base[0] - 14), Math.max(0, base[1] - 12), Math.max(0, base[2] - 8), 255] as [number, number, number, number] : base;
};
const logSide: Painter = (x, y) => {
  const m = blob(x, y, 31, 4);
  // moss is thicker low on the trunk (bigger y = lower in the tile)
  if (m * 0.8 + y / 48 > 0.74) return hash(x, y, 32) > 0.9 ? pick(MOSS_LIGHT, hash(x, y, 33)) : pick(MOSS, hash(x, y, 34));
  return barkSide(x, y, 35);
};

// the cut end: growth rings with a moss rim
const logTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 6.6) return pick(MOSS, hash(x, y, 41));
  if (r > 5.6) return pick(BARK, hash(x, y, 42));
  return pick(RING, ((Math.floor(r + hash(x, y, 43) * 0.6) % 2) * 0.5) + hash(x, y, 44) * 0.4);
};

// a trunk with shelf fungi: two or three bracket caps growing out of the bark
const SHELF = ['#8c4f22', '#a8642c', '#c27e3a', '#d99a52'];
const shelfSide: Painter = (x, y) => {
  for (const [cx, cy, w] of [[4, 4, 4], [11, 9, 3.4], [5, 13, 3]] as const) {
    const dx = (x - cx) / w, dy = (y - cy) / (w * 0.55);
    if (dy <= 0.25 && dx * dx + dy * dy <= 1) {
      if (dy > 0) return hex('#6e3a18'); // the shaded underside
      const band = Math.floor((dx * dx + dy * dy) * 3 + hash(x, y, 51) * 0.5);
      return pick(SHELF, Math.min(0.99, (3 - band) / 4 + hash(x, y, 52) * 0.1));
    }
  }
  return logSide(x, y);
};

// a fern: a curved central stem and paired leaflets, pale green (the biome tint gives it the forest's hue)
const FERN = ['#7fbf56', '#94cf66', '#a9dc79'];
const fern: Painter = (x, y) => {
  for (const [root, lean] of [[7, -0.18], [8, 0.22], [5, -0.45], [11, 0.5]] as const) {
    // each frond grows up from (root, 15) and leans to one side
    const top = root === 7 || root === 8 ? 1 : 5;
    if (y < top) continue;
    const t = (15 - y) / (15 - top);
    const sx = root + lean * (15 - y) * t * 1.6;
    const d = Math.abs(x - sx);
    if (d < 0.6) return hex('#4f8a2f');
    const leaf = (1 - t) * 3 + 0.6; // leaflets are longer near the base
    if (d < leaf && (y + root) % 2 === 0 && hash(x, y, 61) > 0.12) return pick(FERN, hash(x, y, 62));
  }
  return CLEAR;
};

// hanging moss: thin grey-green strands of different lengths, hanging from the top edge
const BEARD = ['#6f8a58', '#7f9a66', '#90aa74', '#5e7a4a'];
const hangingMoss: Painter = (x, y) => {
  const len = 5 + Math.floor(hash(x, 0, 71) * 11);
  if (hash(x, 1, 72) < 0.25) return CLEAR; // gaps between strands
  if (y > len) return CLEAR;
  if (y === len && hash(x, y, 73) > 0.5) return CLEAR;
  return pick(BEARD, hash(x, y, 74));
};

/** Every texture of this biome, by file name (textures/mossy_forest/<name>.png). */
export const MOSSY_FOREST_ART: Record<string, Painter> = {
  moss_carpet_top: mossTop,
  moss_carpet_side: mossSide,
  mossy_log_side: logSide,
  mossy_log_top: logTop,
  shelf_mushroom_side: shelfSide,
  fern,
  hanging_moss: hangingMoss,
};
