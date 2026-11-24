// @ts-check
// Taiga Nevada: the pixel art of its blocks and of its one item, painted by code (16 x 16, original). tools/gen-textures.ts
// writes each one to textures/snowy_taiga/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const shade = (c: Rgba, d: number): Rgba => [Math.max(0, Math.min(255, c[0] + d)), Math.max(0, Math.min(255, c[1] + d)), Math.max(0, Math.min(255, c[2] + d)), c[3]];

// spruce bark: dark grey-brown, broken into small scaly plates (short horizontal cracks, staggered), a reddish tone inside
const BARK = ['#2e231c', '#3a2c23', '#45352a', '#503e31'];
const spruceLogSide: Painter = (x, y) => {
  const row = y >> 1, off = (row & 1) * 2 + Math.floor(hash(row, 0, 301) * 2);
  const plateX = (x + off) % 4;
  if (plateX === 0 && hash(x, row, 302) > 0.25) return hex('#1e1712'); // the gap between two plates
  if ((y & 1) === 0 && hash(x >> 1, y, 303) > 0.7) return hex('#241b15'); // the plate's lower lip
  if (hash(x, y, 304) > 0.95) return hex('#6b4a36'); // the reddish inner bark showing
  return pick(BARK, blob(x, y, 305, 4) * 0.5 + hash(x, y, 306) * 0.5);
};

// the cut end: tight orange-tan rings, a thin dark bark rim
const RING = ['#a87650', '#b98559', '#c69466'];
const spruceLogTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 6.9) return pick(BARK, hash(x, y, 311));
  if (r < 1.1) return hex('#7a4e30');
  return Math.floor(r * 1.7 + hash(x, y, 312) * 0.4) % 2 === 0 ? hex('#8d5d3b') : pick(RING, hash(x, y, 313));
};

// spruce needles: deep blue-green, fine diagonal needle strokes in sprays, small gaps (cutout)
const NEEDLE = ['#183a2c', '#1f4733', '#26553b', '#2f6344', '#3a7350'];
const needleAt = (x: number, y: number, salt: number): Rgba | null => {
  const v = blob(x, y, salt, 4);
  if (hash(x, y, salt + 1) < 0.1 + (v < 0.28 ? 0.12 : 0)) return null;
  const stroke = (x + y + Math.floor(hash(x >> 2, y >> 2, salt + 2) * 4)) % 4 === 0; // the sprays' needles
  const c = pick(NEEDLE, Math.min(0.99, v * 0.6 + hash(x, y, salt + 3) * 0.4));
  return stroke ? shade(c, -14) : hash(x, y, salt + 4) > 0.95 ? hex('#4f8a62') : c;
};
const spruceNeedles: Painter = (x, y) => needleAt(x, y, 321) ?? CLEAR;

// snow: a cold white with blue shadows in soft drifts and a few glints
const SNOW = ['#d6e2ee', '#e2ebf4', '#ecf2f8', '#f6f9fc'];
const snowPx = (x: number, y: number, salt: number): Rgba => {
  if (hash(x, y, salt) > 0.97) return hex('#ffffff');
  return pick(SNOW, Math.min(0.99, blob(x, y, salt + 1, 4) * 0.7 + hash(x, y, salt + 2) * 0.3));
};
// the top of a snowy tier: snow lying on the needles, a few dark tips poking through
const snowyNeedlesTop: Painter = (x, y) => {
  if (hash(x, y, 331) < 0.07) return CLEAR;
  if (blob(x, y, 332, 4) < 0.2 && hash(x, y, 333) > 0.4) return needleAt(x, y, 334) ?? hex('#1f4733');
  return snowPx(x, y, 335);
};
// its side: the needles with a cap of snow along the top, uneven, dripping down here and there
const snowyNeedlesSide: Painter = (x, y) => {
  const depth = 3 + Math.floor(hash(x, 0, 341) * 2) + (hash(x >> 1, 1, 342) > 0.75 ? 2 : 0);
  if (y < depth) return y === depth - 1 && hash(x, y, 343) > 0.6 ? hex('#c3d3e2') : snowPx(x, y, 344);
  return needleAt(x, y, 345) ?? CLEAR;
};

// Frutinha-do-gelo bush: a low round evergreen bush, frosted leaf tips, clusters of red berries
const BUSH = ['#1f4030', '#264d38', '#2e5a40', '#386848'];
const BERRY = ['#9e1626', '#c4202f', '#e0384a'];
const frostBerryBush: Painter = (x, y) => {
  if (hash(x, y, 351) < 0.16) return CLEAR;
  const bx = (x >> 2) * 4 + 1 + Math.floor(hash(x >> 2, y >> 2, 359) * 2), by = (y >> 2) * 4 + 1 + Math.floor(hash(x >> 2, y >> 2, 360) * 2);
  const cluster = hash(x >> 2, y >> 2, 352) > 0.6 && Math.abs(x - bx) + Math.abs(y - by) <= 1; // a little round berry per lit cell
  if (cluster) return hash(x, y, 354) > 0.82 ? hex('#ff9aa2') : pick(BERRY, hash(x, y, 355)); // a berry (and its highlight)
  if (hash(x, y, 356) > 0.9) return hex('#cfe0ea'); // frost on a leaf tip
  return pick(BUSH, Math.min(0.99, blob(x, y, 357, 4) * 0.6 + hash(x, y, 358) * 0.4));
};

// the berries as an item: four round red berries on a short stem with a small dark leaf, a frosty glint on each
const BERRY_ART = [
  '................',
  '.......gg.......',
  '......gLg.......',
  '.....gLLs.......',
  '.......s........',
  '......s.s.......',
  '....kRRk.kRRk...',
  '...kRwRRkRwRRk..',
  '...kRRRDkRRRDk..',
  '....kDDk.kDDk...',
  '.....kRRkRRk....',
  '....kRwRRwRRk...',
  '....kRRRDRRDk...',
  '.....kDDkDDk....',
  '......kk.kk.....',
  '................',
];
const BERRY_INK: Record<string, string> = { k: '#4a0a12', R: '#d0283a', D: '#8e1424', w: '#ffd6da', g: '#1e3f2c', L: '#3a7350', s: '#5a3a22' };
const frostBerries: Painter = (x, y) => { const c = BERRY_ART[y][x]; return c === '.' ? CLEAR : hex(BERRY_INK[c]); };

// icicle: clear pale ice, brighter at the core, faint vertical streaks
const ICE = ['#a9cde6', '#bcdcf0', '#d0e8f7', '#e6f4fc'];
const icicle: Painter = (x, y) => {
  const core = 1 - Math.abs(x - 7.5) / 8;
  if (hash(x, 0, 361) > 0.8) return hex('#94bedc'); // a streak
  return pick(ICE, Math.min(0.99, core * 0.6 + (1 - y / 16) * 0.2 + hash(x, y, 362) * 0.2));
};

// pinecone: overlapping brown scales in a diamond lattice, dark between them, pale scale tips
const pinecone: Painter = (x, y) => {
  const u = (x + y) % 4, v = (x - y + 16) % 4;
  if (u === 0 || v === 0) return hex('#3a2416');
  if (u === 1 && v === 1) return hex('#b48a5c'); // a scale tip
  return pick(['#6e4628', '#7d5230', '#8a5e38'], hash(x, y, 371));
};

// the hot spring vent: dark wet stone with an ochre and rust mineral crust, the opening black-blue in the middle
const STONE = ['#4b4c50', '#55565a', '#5f6064', '#6a6b6e'];
const CRUST = ['#b8873a', '#c99a48', '#a8662e', '#d8b46a'];
const ventTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy) + (hash(x, y, 381) - 0.5) * 0.8;
  if (r < 2.4) return r < 1.4 ? hex('#0f1a22') : hex('#1f3440'); // the opening (and its wet lip)
  if (r < 4.2) return pick(CRUST, hash(x, y, 382)); // the mineral crust round it
  if (r < 5.5 && hash(x, y, 383) > 0.5) return pick(CRUST, hash(x, y, 384) * 0.5);
  return pick(STONE, blob(x, y, 385, 4) * 0.6 + hash(x, y, 386) * 0.4);
};
const ventSide: Painter = (x, y) => {
  const layer = (y + Math.floor(hash(x >> 2, 0, 391) * 2)) % 5 === 0;
  if (layer) return hex('#3c3d41');
  if (y < 6 && hash(x, y, 392) > 0.55 - (6 - y) * 0.06) return pick(CRUST, hash(x, y, 393)); // crust running down from the rim
  return pick(STONE, blob(x, y, 394, 4) * 0.6 + hash(x, y, 395) * 0.4);
};

/** Every texture of this biome, by file name (textures/snowy_taiga/<name>.png). */
export const SNOWY_TAIGA_ART: Record<string, Painter> = {
  spruce_log_side: spruceLogSide,
  spruce_log_top: spruceLogTop,
  spruce_needles: spruceNeedles,
  snowy_needles_top: snowyNeedlesTop,
  snowy_needles_side: snowyNeedlesSide,
  frost_berry_bush: frostBerryBush,
  frost_berries: frostBerries,
  icicle,
  pinecone,
  hot_spring_vent_top: ventTop,
  hot_spring_vent_side: ventSide,
};
