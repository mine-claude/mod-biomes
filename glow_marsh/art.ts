// @ts-check
// Brejo Luminoso: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/glow_marsh/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const MUD = ['#3b2c20', '#45331f', '#4e3a26', '#57412b', '#3f3324'];
const MUD_WET = ['#5f5a3e', '#6b6646', '#77724f'];
const PEAT = ['#2a1d14', '#33241a', '#3c2b1e', '#2f2219'];
const PEAT_FIBRE = ['#5a4430', '#6a5036', '#4f3c2a'];
const DEAD = ['#5e5850', '#6b655c', '#78726a', '#544e47'];
const DEAD_DARK = ['#3f3a35', '#48433d'];

// mud seen from above: dark clay with puddles that catch the sky and a few pocked holes
const mudTop: Painter = (x, y) => {
  const wet = blob(x, y, 101, 4);
  if (wet > 0.72) return pick(MUD_WET, hash(x, y, 102));
  if (hash(x, y, 103) > 0.95) return hex('#2a1f17'); // a pock left by a bubble
  return pick(MUD, blob(x, y, 104, 2) * 0.6 + hash(x, y, 105) * 0.4);
};

// the side of mud: wet bands that sag, darker low down
const mudSide: Painter = (x, y) => {
  const sag = Math.floor(hash(x >> 1, 0, 111) * 2);
  if (y <= 1 + sag) return pick(MUD_WET, hash(x, y, 112) * 0.7);
  if (hash(x, y, 113) > 0.96) return hex('#6b5a48'); // a pebble
  return pick(MUD, Math.min(0.99, hash(x, y, 114) * 0.7 + y / 60));
};

// peat: almost black, packed with pale root fibres running sideways
const peat: Painter = (x, y) => {
  const fibre = (y + Math.floor(hash(x >> 2, y >> 3, 121) * 3)) % 5 === 0 && hash(x, y, 122) > 0.35;
  if (fibre) return pick(PEAT_FIBRE, hash(x, y, 123));
  return pick(PEAT, blob(x, y, 124, 4) * 0.5 + hash(x, y, 125) * 0.5);
};

// reeds: a clump of tall stems; the bottom tile is stems and leaf blades, the top tile ends in brown seed heads
const STEM = ['#5f7f34', '#6f9140', '#7fa34a', '#557230'];
const stems = (x: number, y: number, salt: number): Rgba | null => {
  for (const [sx, lean] of [[3, 0.08], [7, -0.05], [10, 0.12], [13, -0.1]] as const) {
    const cx = sx + lean * (15 - y) + (salt === 2 ? lean * 16 : 0);
    if (Math.abs(x - cx) < 0.7) return pick(STEM, hash(x, y, 130 + salt));
  }
  return null;
};
const reedBottom: Painter = (x, y) => {
  const s = stems(x, y, 1);
  if (s) return s;
  // two long leaf blades curving out of the clump
  for (const [root, dir] of [[6, -1], [11, 1]] as const) {
    const t = (15 - y) / 12;
    if (t < 0 || t > 1) continue;
    const bx = root + dir * t * t * 5;
    if (Math.abs(x - bx) < 0.6) return pick(STEM, 0.3 + hash(x, y, 135) * 0.6);
  }
  return CLEAR;
};
const HEAD = ['#5a3a1e', '#6b4626', '#7a522e'];
const reedTop: Painter = (x, y) => {
  for (const [sx, top] of [[4, 2], [8, 5], [11, 1], [14, 7]] as const) {
    const cx = sx + (15 - y) * 0.02;
    // the seed head: a brown cigar on the stem, then a thin tip
    if (y >= top && y <= top + 4 && Math.abs(x - cx) < 1.1) return pick(HEAD, hash(x, y, 141));
    if (y === top - 1 && Math.abs(x - cx) < 0.5) return hex('#8a9a50');
    if (y > top + 4 && Math.abs(x - cx) < 0.6) return pick(STEM, hash(x, y, 142));
  }
  return CLEAR;
};

// the glow fungus: thin pale stalks with round caps whose gills shine blue-green (the block itself emits light)
const CAP = ['#46d8b6', '#62f0cc', '#8dffe0', '#39b89c'];
const glowFungus: Painter = (x, y) => {
  for (const [cx, cy, r, stalk] of [[4, 7, 2.6, 15], [10, 4, 3.2, 15], [12, 11, 1.8, 15], [6, 12, 1.5, 15]] as const) {
    const dx = x - cx, dy = (y - cy) * 1.6;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= r && y <= cy) return d > r - 0.9 ? hex('#2f8c78') : pick(CAP, hash(x, y, 151) * 0.5 + (1 - d / r) * 0.5);
    if (y === cy + 1 && Math.abs(dx) < r) return hex('#b8fff0'); // the shining gill line
    if (y > cy + 1 && y <= stalk && Math.abs(dx) < 0.6) return hex('#c9d8c0');
  }
  if (hash(x, y, 152) > 0.985) return hex('#a8ffe8'); // a drifting spore
  return CLEAR;
};

// a drowned dead log: grey bleached bark with deep cracks, and its cut end
const deadSide: Painter = (x, y) => {
  const crack = (x * 3 + Math.floor(hash(0, y >> 2, 161) * 4)) % 7 === 0;
  if (crack) return pick(DEAD_DARK, hash(x, y, 162));
  if (y >= 13 && hash(x, y, 163) > 0.45) return pick(MUD_WET, hash(x, y, 164)); // the water line stain
  return pick(DEAD, blob(x, y, 165, 4) * 0.5 + hash(x, y, 166) * 0.5);
};
const deadTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 6.6) return pick(DEAD_DARK, hash(x, y, 171));
  if (hash(x, y, 172) > 0.9) return hex('#2c2722'); // rot
  return pick(['#8a8378', '#97907f', '#7c766c'], ((Math.floor(r) % 2) * 0.5) + hash(x, y, 173) * 0.4);
};

// the marsh pad: a round floating leaf with a notch and pale veins, drawn on the top face; transparent around it
const PAD = ['#3f7a34', '#4a8a3a', '#558f40', '#3a6e30'];
const marshPad: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 7.2) return CLEAR;
  const ang = Math.atan2(dy, dx);
  if (ang > 0.15 && ang < 0.75 && r > 1.2) return CLEAR; // the notch
  if (r > 6.4) return hex('#2f5a28');
  const vein = Math.abs(Math.sin(ang * 4)) < 0.12 && r > 1.5;
  if (vein) return hex('#7fb05a');
  return pick(PAD, blob(x, y, 181, 4) * 0.6 + hash(x, y, 182) * 0.4);
};

/** Every texture of this biome, by file name (textures/glow_marsh/<name>.png). */
export const GLOW_MARSH_ART: Record<string, Painter> = {
  mud_top: mudTop,
  mud_side: mudSide,
  peat,
  reed_bottom: reedBottom,
  reed_top: reedTop,
  glow_fungus: glowFungus,
  dead_log_side: deadSide,
  dead_log_top: deadTop,
  marsh_pad: marshPad,
};
