// @ts-check
// Savana Dourada: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/golden_savanna/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

// ---- the tall golden grass (two blocks): thin wiry blades, straw at the root, gold above, seed plumes on the top tile
const STRAW = ['#9c7a33', '#ad8a3b', '#bd9a45'];
const GOLD = ['#c9a646', '#d6b552', '#e2c460', '#edd27a'];
const BLADES: ReadonlyArray<readonly [number, number]> = [[2, 0.18], [4, -0.12], [6, 0.06], [8, -0.2], [9, 0.15], [11, -0.05], [13, 0.22], [14, -0.16]];
const blade = (x: number, y: number, y0: number, salt: number): Rgba | null => {
  for (let i = 0; i < BLADES.length; i++) {
    const [root, lean] = BLADES[i];
    const t = 31 - (y + y0); // height above the root, over both tiles (0..31)
    const cx = root + lean * t * 0.55;
    if (Math.abs(x - cx) < 0.62 && hash(i, 0, salt) < 0.9) return pick(t < 10 ? STRAW : GOLD, hash(x, y + y0, salt + i));
  }
  return null;
};
const savannaGrassBottom: Painter = (x, y) => blade(x, y, 16, 301) ?? CLEAR;
const savannaGrassTop: Painter = (x, y) => {
  // the blades end at different heights; the tallest carry a loose seed plume
  for (const [root, lean, end] of [[4, -0.12, 3], [8, -0.2, 1], [13, 0.22, 4], [11, -0.05, 7]] as const) {
    const t = 31 - y, cx = root + lean * t * 0.55;
    if (y < end || y >= end + 6) continue;
    const d = x - cx;
    if (Math.abs(d) < 0.55) return hex('#b8964a'); // the stalk through the plume
    if (Math.abs(d) < 1.6 && (y + (d < 0 ? 0 : 1)) % 2 === 0 && hash(x, y, 311) > 0.35) return pick(['#ead39a', '#f3e2b0', '#dcc07a'], hash(x, y, 312)); // the seeds, alternating
  }
  if (y < 6) return CLEAR;
  return blade(x, y, 0, 301) ?? CLEAR;
};

// ---- the savanna tree: a thin, grey-brown bark in rough plates; the cut end a dense reddish heartwood
const BARK = ['#5a4a3c', '#66554a', '#726052', '#7d6b5c'];
const logSide: Painter = (x, y) => {
  const plate = hash(x >> 2, (y + (x >> 2) * 3) >> 2, 321);
  const seam = (y + (x >> 2) * 3) % 4 === 0 || x % 4 === 0;
  if (seam && hash(x, y, 322) > 0.25) return hex('#3b3028');
  if (hash(x, y, 323) > 0.975) return hex('#b3a57a'); // a pale scar
  return pick(BARK, plate * 0.6 + hash(x, y, 324) * 0.4);
};
const logTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.sqrt(dx * dx + dy * dy);
  if (r > 6.6) return pick(BARK, hash(x, y, 331));
  if (r > 5.6) return hex('#c79a63'); // a thin pale sapwood
  return Math.floor(r * 1.6 + hash(x, y, 332) * 0.4) % 3 === 0 ? hex('#7a3f24') : pick(['#94502d', '#a35c33', '#8a4a2a'], hash(x, y, 333));
};

// the flat umbrella canopy: small olive leaflets in tight horizontal sprays, with gaps (cutout)
const LEAF = ['#4c6a24', '#58782a', '#648632', '#71933a', '#809f44'];
const leaves: Painter = (x, y) => {
  const spray = (y + Math.floor(hash(x >> 2, 0, 341) * 3)) % 3;
  if (spray === 0 && hash(x, y, 342) < 0.55) return CLEAR;
  if (hash(x, y, 343) < 0.08) return CLEAR;
  if (hash(x, y, 344) > 0.95) return hex('#a3b85a'); // a sunlit tip
  return pick(LEAF, Math.min(0.99, blob(x, y, 345, 4) * 0.55 + hash(x, y, 346) * 0.45));
};

// ---- termite earth: sun-baked laterite, orange-ochre, packed in grainy layers with the odd pore
const EARTH = ['#9a5a30', '#a86536', '#b5713e', '#c07c46', '#8e5230'];
const earthGrain = (x: number, y: number, salt: number): Rgba => {
  const layer = (y + Math.floor(blob(x, 0, salt, 8) * 3)) % 4;
  return pick(EARTH, Math.min(0.99, (layer === 0 ? 0.15 : 0.45) + hash(x, y, salt + 1) * 0.5));
};
const termiteEarth: Painter = (x, y) => (hash(x, y, 351) > 0.95 ? hex('#5c3219') : earthGrain(x, y, 352));
// the mound's side: the same earth, with dark tunnel mouths and pale dried streaks running down
const termiteMound: Painter = (x, y) => {
  const tx = 3 + ((y >> 2) * 5) % 11, ty = 2 + (y >> 2) * 4;
  if (Math.abs(x - tx) + Math.abs(y - ty) < 1.2) return hex('#3a1f10'); // a tunnel mouth
  if (hash(x, 0, 353) > 0.82 && hash(x, y >> 1, 354) > 0.3) return hex('#cf9160'); // a dried streak
  return earthGrain(x, y, 355);
};
const termiteMoundTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5;
  if (dx * dx + dy * dy < 2.5) return hex('#3a1f10'); // the vent
  return earthGrain(x, y, 356);
};

// ---- the dry thorn bush: a tangle of grey-brown twigs with long pale thorns and a few tiny leaves
const thornBush: Painter = (x, y) => {
  for (const [rx, a, len] of [[7, -0.9, 12], [8, 0.8, 13], [7, -0.3, 14], [8, 0.35, 12], [6, -1.4, 8], [9, 1.5, 8]] as const) {
    const t = 15 - y;
    if (t < 0 || t > len) continue;
    const cx = rx + a * t * 0.55 + Math.sin(t * 0.9 + a * 3) * 0.6;
    const d = Math.abs(x - cx);
    if (d < 0.6) return pick(['#5d4c3e', '#6b5a49', '#4f4034'], hash(x, y, 361));
    if (d < 2.2 && t % 3 === 1 && hash(x, y, 362) > 0.55) return hex('#d8cfb4'); // a thorn
    if (d < 1.8 && t > 5 && hash(x, y, 363) > 0.86) return pick(['#7a8a3a', '#8c9a45'], hash(x, y, 364)); // a tiny leaf
  }
  return CLEAR;
};

// ---- bleached bones: sun-whitened, chalky, with cracks and porous ends
const BONE = ['#ddd5c0', '#e6dfcc', '#efe9d9', '#d1c8b1'];
const bleachedBones: Painter = (x, y) => {
  if (hash(x, y, 371) > 0.93) return hex('#b3a88e'); // a crack
  if ((x === 0 || x === 15 || y === 0 || y === 15) && hash(x, y, 372) > 0.5) return hex('#c4b99d'); // the porous end
  return pick(BONE, blob(x, y, 373, 4) * 0.5 + hash(x, y, 374) * 0.5);
};

// ---- lichen boulder: a rounded grey granite, coarse-grained, patched with orange and pale green lichen
const GRANITE = ['#77736c', '#827d75', '#8e8980', '#9a958b', '#6b6862'];
const lichen = (x: number, y: number, salt: number): Rgba | null => {
  const v = blob(x, y, salt, 4);
  if (v > 0.7 && hash(x, y, salt + 1) > 0.25) return pick(['#c98a2e', '#d89a3a', '#b9792a'], hash(x, y, salt + 2));
  if (v < 0.22 && hash(x, y, salt + 3) > 0.35) return pick(['#9fae78', '#b0bd88'], hash(x, y, salt + 4));
  return null;
};
const boulderSide: Painter = (x, y) => lichen(x, y, 381) ?? pick(GRANITE, Math.min(0.99, hash(x, y, 382) * 0.7 + (hash(x >> 1, y >> 1, 383) > 0.8 ? 0.3 : 0)));
const boulderTop: Painter = (x, y) => lichen(x, y, 391) ?? pick(GRANITE, hash(x, y, 392));

// ---- the weaver-bird nest: tightly woven dry grass, the strands crossing on the diagonal
const WEAVE = ['#8f7a3e', '#a08a48', '#b39c55', '#7d6a35'];
const weaverNest: Painter = (x, y) => {
  const a = (x + y) % 4, b = (x - y + 16) % 4;
  if (a === 0 && b === 0) return hex('#5a4a24');
  return pick(WEAVE, Math.min(0.99, (a === 1 ? 0.6 : 0.2) + hash(x, y, 401) * 0.4));
};

/** Every texture of this biome, by file name (textures/golden_savanna/<name>.png). */
export const GOLDEN_SAVANNA_ART: Record<string, Painter> = {
  savanna_grass_bottom: savannaGrassBottom,
  savanna_grass_top: savannaGrassTop,
  savanna_log_side: logSide,
  savanna_log_top: logTop,
  savanna_leaves: leaves,
  termite_earth: termiteEarth,
  termite_mound_side: termiteMound,
  termite_mound_top: termiteMoundTop,
  thorn_bush: thornBush,
  bleached_bones: bleachedBones,
  lichen_boulder_side: boulderSide,
  lichen_boulder_top: boulderTop,
  weaver_nest: weaverNest,
};
