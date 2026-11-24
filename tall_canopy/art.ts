// @ts-check
// Bosque de Copas Altas: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one
// to textures/tall_canopy/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

// a pale, smooth grey-brown bark with long vertical fissures (a tall straight trunk), the odd lichen spot
const BARK = ['#6e6256', '#7a6d60', '#86796a', '#928473'];
const FISSURE = ['#463c33', '#52473c'];
const logSide: Painter = (x, y) => {
  const col = (x + Math.floor(hash(x >> 2, 0, 201) * 3)) % 5;
  const broken = hash(x, y >> 2, 202) > 0.82; // fissures break now and then
  if (col === 0 && !broken) return pick(FISSURE, hash(x, y, 203));
  if (hash(x, y, 204) > 0.96) return hex('#a7b38a'); // lichen
  const base = pick(BARK, blob(x, y, 205, 4) * 0.6 + hash(x, y, 206) * 0.4);
  return col === 1 ? [base[0] - 10, base[1] - 9, base[2] - 8, 255] as Rgba : base;
};

// the cut end: wide pale sapwood, tight dark rings
const RING = ['#b59a6e', '#c4a97b', '#cfb587'];
const logTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 6.8) return pick(BARK, hash(x, y, 211));
  if (r < 1) return hex('#8a6a44');
  const ring = Math.floor(r * 1.4 + hash(x, y, 212) * 0.5) % 3 === 0;
  return ring ? hex('#8f7550') : pick(RING, hash(x, y, 213));
};

// the canopy's leaves: deep green, small broad leaves in clusters, with gaps (cutout) that let light speckle through
const LEAF = ['#2c5e24', '#336b29', '#3c782f', '#468536', '#55963f'];
const leaves: Painter = (x, y) => {
  const v = blob(x, y, 221, 4);
  if (hash(x, y, 222) < 0.13 + (v < 0.3 ? 0.12 : 0)) return CLEAR;
  if (hash(x, y, 223) > 0.94) return hex('#74b04f'); // a sunlit edge
  return pick(LEAF, Math.min(0.99, v * 0.7 + hash(x, y, 224) * 0.3));
};

// Samambaia-de-sombra: a tall, upright shade fern — several straight fronds fanning from the base, dark blue-green
const SHADE = ['#2f6a44', '#387a4e', '#428a59', '#4f9a66'];
const canopyFern: Painter = (x, y) => {
  for (const [lean, top] of [[0, 1], [-0.42, 3], [0.42, 3], [-0.8, 7], [0.8, 7]] as const) {
    if (y < top) continue;
    const sx = 7.5 + lean * (15 - y);
    const d = Math.abs(x - sx);
    if (d < 0.55) return hex('#2a5233');
    if (d < 2 - (15 - y) / 14 && (x + y) % 2 === 0 && hash(x, y, 231) > 0.15) return pick(SHADE, hash(x, y, 232));
  }
  return CLEAR;
};

// Moita-de-sombra: a low round undergrowth bush, dark leaves with a few pale berries
const BUSH = ['#2d5a2a', '#356631', '#3e733a', '#4a8244'];
const undergrowth: Painter = (x, y) => {
  const dx = (x - 7.5) / 7.6, dy = (y - 11) / 5.6;
  if (dx * dx + dy * dy > 1 || y > 15) return CLEAR;
  if (hash(x, y, 241) < 0.14) return CLEAR;
  if (hash(x, y, 242) > 0.95) return hex('#d9d3b4'); // a pale berry
  if (y >= 14 && Math.abs(x - 7.5) < 1.5) return hex('#4a3826'); // the stem
  return pick(BUSH, Math.min(0.99, (1 - (y - 5) / 11) * 0.5 + hash(x, y, 243) * 0.5));
};

/** Every texture of this biome, by file name (textures/tall_canopy/<name>.png). */
export const TALL_CANOPY_ART: Record<string, Painter> = {
  canopy_log_side: logSide,
  canopy_log_top: logTop,
  canopy_leaves: leaves,
  canopy_fern: canopyFern,
  undergrowth,
};
