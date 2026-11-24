// @ts-check
// Prado Florido: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/flower_meadow/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const STEM = ['#3f7d2c', '#4a8c33', '#57993b'];
const LEAF = ['#4f9a36', '#5ea842', '#6db64d'];

// a thin stem that sways a little, from the bottom edge up to `top`, with one or two leaves
function stem(x: number, y: number, top: number, salt: number): Rgba | null {
  if (y < top || y > 15) return null;
  const sx = 7 + Math.round(Math.sin((15 - y) / 3.2 + salt) * 0.8);
  if (x === sx) return pick(STEM, hash(x, y, salt));
  // a leaf to each side, low on the stem
  for (const [ly, side] of [[12, -1], [10, 1]] as const) {
    const d = (x - sx) * side;
    if (d >= 1 && d <= 3 && Math.abs(y - (ly - Math.floor(d / 2))) <= (d === 3 ? 0 : 1) - (d === 1 ? 0 : 0)) return pick(LEAF, hash(x, y, salt + 1));
  }
  return null;
}

// Flor-de-estrela: a five-pointed blue-violet star with a pale centre
const STAR = ['#3b4fc4', '#4f63d8', '#6a7ee6', '#8796ef'];
const starflower: Painter = (x, y) => {
  const cx = 7.5, cy = 5, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
  if (r < 1.2) return hex('#f2e9a6');
  const a = Math.atan2(dy, dx) + Math.PI / 2;
  const arm = 2.2 + 2.6 * Math.pow(Math.abs(Math.cos(a * 2.5)), 3); // five points
  if (r <= arm) return pick(STAR, Math.min(0.99, r / arm * 0.8 + hash(x, y, 101) * 0.25));
  return stem(x, y, 8, 1) ?? CLEAR;
};

// Flor-de-sino: an arching stem with three coral bells hanging from it
const BELL = ['#c2475a', '#d65d6b', '#e67a82', '#f19aa0'];
const bellflower: Painter = (x, y) => {
  // the arch: from (7, 15) up to (7, 4), then bending right to (12, 3)
  if ((x === 7 && y >= 4) || (y === 3 && x >= 8 && x <= 12) || (x === 8 && y === 3)) return pick(STEM, hash(x, y, 111));
  for (const [bx, by] of [[4, 6], [10, 5], [13, 6]] as const) {
    const dx = x - bx, dy = y - by;
    if (dy >= 0 && dy <= 3 && Math.abs(dx) <= 1 + (dy >= 2 ? 1 : 0) - (dy === 0 ? 1 : 0)) {
      if (dy === 3 && Math.abs(dx) === 2) return CLEAR;
      return pick(BELL, Math.min(0.99, (3 - dy) / 4 + hash(x, y, 112) * 0.2));
    }
    if (dy === -1 && dx === 0) return pick(STEM, 0.5); // the little hook each bell hangs from
  }
  if (y === 5 && x >= 4 && x <= 6) return pick(STEM, 0.2); // the short branch to the left bell
  return stem(x, y, 8, 2) ?? CLEAR;
};

// Flor-de-taça: a deep golden cup, orange inside, open at the top
const CUP = ['#d9a114', '#e8b622', '#f3c93b', '#fbd95e'];
const cupflower: Painter = (x, y) => {
  const dx = Math.abs(x - 7.5);
  if (y >= 2 && y <= 7) {
    const w = 1.6 + (y - 2) * 0.35 + (y >= 6 ? -(y - 5) * 0.9 : 0); // widens down, then closes at the base
    const rim = y <= 3 ? 3.2 - (3 - y) * 0.3 : w + 0.6;
    const half = Math.max(w, Math.min(rim, 3.4));
    if (dx <= half) {
      if (y <= 3 && dx < half - 1.2) return hex('#d4721a'); // the orange throat seen from above
      if (y === 2 && Math.round(dx) % 2 === 1) return CLEAR; // scalloped rim
      return pick(CUP, Math.min(0.99, (1 - dx / 4) * 0.6 + hash(x, y, 121) * 0.4));
    }
  }
  return stem(x, y, 8, 3) ?? CLEAR;
};

// Flor-de-renda: a flat umbel of tiny white florets with a lilac blush
const LACE = ['#f4f1ea', '#ffffff', '#e8e2f2', '#d9cfe9'];
const laceflower: Painter = (x, y) => {
  const dx = x - 7.5, dy = (y - 4) * 1.8;
  if (Math.hypot(dx, dy) <= 5.6 && y <= 5 && hash(x, y, 131) > 0.28) return (x + y) % 3 === 0 ? hex('#b79ad6') : pick(LACE, hash(x, y, 132));
  // the rays of the umbel, down to the stem top
  if (y >= 6 && y <= 8 && Math.abs(dx) <= (8 - y) * 1.4 + 0.5 && Math.round(Math.abs(dx)) % 2 === (y % 2)) return pick(STEM, hash(x, y, 133));
  return stem(x, y, 8, 4) ?? CLEAR;
};

// Colmeia Silvestre: a wild comb in grey-brown bark-paper bands, with a dark entrance and a few bees' worth of honey glints
const PAPER = ['#8a6b45', '#9c7b50', '#ae8c5d', '#c09d6b'];
const hiveSide: Painter = (x, y) => {
  // rounded silhouette: the corners are clear so the hive reads as a lump hanging under the leaves
  const ex = Math.abs(x - 7.5) / 8, ey = Math.abs(y - 7.5) / 8;
  if (ex * ex + ey * ey > 1.02) return CLEAR;
  if (Math.hypot(x - 7.5, y - 10.5) < 1.6) return hex('#2b1d10'); // the entrance
  const band = Math.floor((y + Math.sin(x * 0.9) * 0.8) / 2.4);
  if (hash(x, y, 141) > 0.95) return hex('#f0b93a'); // a honey glint
  return pick(PAPER, Math.min(0.99, Math.abs(band % 2) * 0.45 + hash(x, y, 142) * 0.4 + blob(x, y, 143, 4) * 0.2));
};
const COMB = ['#d89a26', '#e8ad35', '#f3c14e'];
const hiveTop: Painter = (x, y) => {
  // the comb seen from above: hexagon-ish cells of honey in a paper rim
  const ex = Math.abs(x - 7.5) / 8, ey = Math.abs(y - 7.5) / 8;
  if (ex * ex + ey * ey > 1.02) return CLEAR;
  if (ex * ex + ey * ey > 0.62) return pick(PAPER, hash(x, y, 151));
  const row = Math.floor(y / 3), col = Math.floor((x + (row % 2) * 1.5) / 3);
  const wall = (y % 3 === 0) || (Math.floor(x + (row % 2) * 1.5) % 3 === 0);
  if (wall) return hex('#7a5a33');
  return pick(COMB, hash(col, row, 152));
};

/** Every texture of this biome, by file name (textures/flower_meadow/<name>.png). */
export const FLOWER_MEADOW_ART: Record<string, Painter> = {
  starflower, bellflower, cupflower, laceflower,
  wild_hive_side: hiveSide,
  wild_hive_top: hiveTop,
};
