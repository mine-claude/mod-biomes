// @ts-check
// Dunas Vermelhas: the pixel art of its blocks, painted by code (16 x 16, original). tools/gen-textures.ts writes each one to
// textures/red_dunes/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const SAND = ['#a2431f', '#b04d24', '#bb5729', '#c4622f', '#cf6f37'];
const SAND_LIGHT = ['#dc8a4c', '#e59a5c'];
const SAND_DARK = ['#8a3618', '#7c3015'];
const BANDS = ['#9c3f1f', '#b5562b', '#cf7a43', '#e0a36a', '#c2653a', '#a84a24', '#d98d55', '#8f3a1d'];
const shade = (c: Rgba, k: number): Rgba => [Math.max(0, Math.min(255, Math.round(c[0] * k))), Math.max(0, Math.min(255, Math.round(c[1] * k))), Math.max(0, Math.min(255, Math.round(c[2] * k))), c[3]];

// red sand: fine grains, soft wind ripples running diagonally, a few bright and dark grains
const redSand: Painter = (x, y) => {
  const ripple = ((x + y * 2 + Math.floor(blob(x, y, 101, 8) * 3)) % 6) === 0;
  if (hash(x, y, 102) > 0.95) return pick(SAND_LIGHT, hash(x, y, 103));
  if (hash(x, y, 104) > 0.96) return pick(SAND_DARK, hash(x, y, 105));
  const v = blob(x, y, 106, 4) * 0.5 + hash(x, y, 107) * 0.5;
  return ripple ? shade(pick(SAND, v), 0.86) : pick(SAND, v);
};

// banded sandstone, side: horizontal strata of reds, ochres and cream, each band a little wavy, with fine cracks
const bandAt = (x: number, y: number) => {
  const wave = Math.floor(blob(x, 0, 111, 8) * 2.2);
  return Math.floor((y + wave) / 2) % BANDS.length;
};
const sandstoneSide: Painter = (x, y) => {
  const c = hex(BANDS[bandAt(x, y)]);
  if (hash(x, y, 112) > 0.93) return shade(c, 0.78); // a crack or a pore
  return shade(c, 0.92 + hash(x, y, 113) * 0.16);
};
// banded sandstone, top: the cut face, concentric growth of the layers seen from above
const sandstoneTop: Painter = (x, y) => {
  const r = Math.hypot(x - 7.5 + blob(x, y, 121, 8) * 3 - 1.5, y - 7.5);
  const c = hex(BANDS[Math.floor(r / 2.2) % BANDS.length]);
  return shade(c, 0.9 + hash(x, y, 122) * 0.18);
};

// column cactus: deep ribs running up, pale spines in pairs on the ridges, a lighter crown on top
const GREEN = ['#2f5a2a', '#3c6d31', '#4a7f39', '#5a9142'];
const cactusSide: Painter = (x, y) => {
  const rib = x % 4; // 0 = the furrow, 2 = the ridge
  if (rib === 0) return hex('#24461f');
  if (rib === 2 && (y + (x >> 2)) % 4 === 1) return hex('#e9dcae'); // a spine
  return pick(GREEN, (rib === 2 ? 0.75 : rib === 1 ? 0.35 : 0.5) + hash(x, y, 131) * 0.24);
};
const cactusTop: Painter = (x, y) => {
  const dx = x - 7.5, dy = y - 7.5, r = Math.hypot(dx, dy);
  if (r > 7.2) return hex('#24461f');
  const a = Math.atan2(dy, dx), rib = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 8 + 0.5) % 2;
  if (r < 1.8) return hex('#e2c46a'); // the woolly crown
  if (rib === 0 && hash(x, y, 141) > 0.75) return hex('#e9dcae');
  return pick(GREEN, (rib ? 0.3 : 0.7) + hash(x, y, 142) * 0.25);
};

// fossil bone, side: a bundle of pale bone set in red sandstone — two long bones with knobbed ends, fine cracks
const BONE = ['#d8cba8', '#e6dcbf', '#f0e8d2', '#c9b994'];
const MATRIX = ['#9c4523', '#ad5129', '#b85c30'];
const boneSide: Painter = (x, y) => {
  // two bones lying across, at rows 3..6 and 9..12, each with a knob at both ends
  for (const [cy, x0, x1] of [[4.5, 1, 14], [10.5, 2, 13]] as const) {
    const knob = Math.min(Math.hypot(x - x0, y - cy), Math.hypot(x - x1, y - cy)) < 2.3;
    if ((x >= x0 && x <= x1 && Math.abs(y - cy) < 1.5) || knob) {
      if (hash(x, y, 151) > 0.9) return hex('#a89870'); // a crack
      return pick(BONE, (Math.abs(y - cy) < 0.6 ? 0.7 : 0.2) + hash(x, y, 152) * 0.3);
    }
  }
  return pick(MATRIX, hash(x, y, 153));
};
// fossil bone, top: a cross-section — a bone ring around the spongy marrow, in the sandstone
const boneTop: Painter = (x, y) => {
  const r = Math.hypot(x - 7.5, y - 7.5);
  if (r > 6.8) return pick(MATRIX, hash(x, y, 161));
  if (r > 3.6) return pick(BONE, 0.3 + hash(x, y, 162) * 0.7);
  return hash(x, y, 163) > 0.55 ? hex('#8b7656') : hex('#c4b28a'); // the marrow's pores
};

// fossil skeleton: the bare bone of the shaped parts (each box samples the part of the tile under it, so the tile is even):
// weathered ivory, rust-red stains of the sand soaked in, a few dark pores and hairline cracks
const AGED = ['#d3c19d', '#dbc9a7', '#e3d4b5', '#eadec3'];
const skeleton: Painter = (x, y) => {
  if (hash(x, y, 181) > 0.975) return hex('#9c8564'); // a pore
  if (((x * 3 + y * 5 + Math.floor(blob(x, y, 182, 8) * 4)) % 11) === 0 && hash(x, y, 183) > 0.7) return hex('#bba57f'); // a crack
  const stain = blob(x, y, 184, 8);
  if (stain > 0.72) return shade(pick(AGED, hash(x, y, 185)), 0.93 - (stain - 0.72) * 0.3); // stained by the red sand
  return pick(AGED, blob(x, y, 186, 4) * 0.7 + hash(x, y, 187) * 0.3);
};
const stainTint = (c: Rgba): Rgba => [Math.min(255, c[0] + 10), c[1], Math.max(0, c[2] - 14), 255];

// dry shrub: a tangle of thin grey-brown twigs from one root, a few withered leaves
const TWIG = ['#6b4a2e', '#7d5a39', '#8c6a45', '#5e4129'];
const dryShrub: Painter = (x, y) => {
  for (const [lean, top, salt] of [[-0.55, 4, 1], [0.5, 3, 2], [-0.15, 1, 3], [0.9, 7, 4], [-0.95, 8, 5]] as const) {
    if (y < top) continue;
    const t = (15 - y) / (15 - top);
    const sx = 7.5 + lean * (15 - y) * (0.7 + t * 0.5) + (hash(salt, y >> 1, 171) - 0.5) * 0.8;
    if (Math.abs(x - sx) < 0.55) return pick(TWIG, hash(x, y, 172));
    // short side twigs, and a dry leaf at some of their tips
    if ((y + salt) % 3 === 0 && Math.abs(x - sx - (lean > 0 ? 1 : -1)) < 0.5 && t > 0.2) return hash(x, y, 173) > 0.6 ? hex('#a58a4a') : pick(TWIG, 0.9);
  }
  return CLEAR;
};

/** Every texture of this biome, by file name (textures/red_dunes/<name>.png). */
export const RED_DUNES_ART: Record<string, Painter> = {
  red_sand: redSand,
  banded_sandstone_side: sandstoneSide,
  banded_sandstone_top: sandstoneTop,
  column_cactus_side: cactusSide,
  column_cactus_top: cactusTop,
  fossil_bone_side: boneSide,
  fossil_bone_top: boneTop,
  dry_shrub: dryShrub,
  fossil_skeleton: (x, y) => { const c = skeleton(x, y); return blob(x, y, 184, 8) > 0.72 ? stainTint(c) : c; },
};
