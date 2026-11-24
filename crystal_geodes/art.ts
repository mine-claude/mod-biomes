// @ts-check
// Geodos de Cristal: the pixel art of its blocks and of its item, painted by code (16 x 16, original). tools/gen-textures.ts
// writes each one to textures/crystal_geodes/<name>.png; `--check` compares with the committed files.
import { CLEAR, blob, hash, hex, pick, type Painter, type Rgba } from '../src/pixel.ts';

const BASALT = ['#2b2a30', '#313037', '#36353d', '#2e2d34', '#3b3a42'];
const CALCITE = ['#d9d4c8', '#e2ddd2', '#cfc9bc', '#e8e4da', '#c6c0b2'];
const AMETHYST = ['#4a2a7a', '#5a3490', '#6a3fa6', '#7b4cbb', '#53308a'];
const AMETHYST_LIGHT = ['#9a73d8', '#b08ce6', '#c7a8f2'];
const GLOW = ['#e7d6ff', '#f4ecff', '#d2b8ff'];

// smooth geode basalt: a dark, polished rind with faint long streaks and a soft sheen
const geodeBasalt: Painter = (x, y) => {
  const streak = blob(x, y >> 2, 401, 4);
  if (streak > 0.78 && hash(x, y, 402) > 0.4) return hex('#45444d'); // the sheen
  if (hash(x, y, 403) > 0.97) return hex('#232227'); // a pore
  return pick(BASALT, blob(x, y, 404, 4) * 0.55 + hash(x, y, 405) * 0.45);
};

// calcite: a pale, sugary stone with fine grains and a few warm flecks
const calcite: Painter = (x, y) => {
  if (hash(x, y, 411) > 0.95) return hex('#b4ad9e'); // a grain shadow
  if (hash(x, y, 412) > 0.97) return hex('#e9d9b8'); // a warm fleck
  return pick(CALCITE, blob(x, y, 413, 2) * 0.5 + hash(x, y, 414) * 0.5);
};

// amethyst seen as a block: violet crystal faces meeting at angles, light along the facet edges
const facet = (x: number, y: number, salt: number) => {
  // a few slanted lines across the tile split it into facets; which side of each line a pixel is on picks its shade
  let k = 0;
  for (const [a, b, c] of [[1, 1, -15], [1, -1, 2], [2, 1, -26], [1, -2, 9]] as const) k = (k * 2) + (a * x + b * y + c > 0 ? 1 : 0);
  return hash(k, 0, salt);
};
const edge = (x: number, y: number) => {
  for (const [a, b, c] of [[1, 1, -15], [1, -1, 2], [2, 1, -26], [1, -2, 9]] as const) if (Math.abs(a * x + b * y + c) < 0.9) return true;
  return false;
};
const amethyst: Painter = (x, y) => {
  if (edge(x, y)) return pick(AMETHYST_LIGHT, hash(x, y, 421) * 0.8);
  return pick(AMETHYST, facet(x, y, 422) * 0.7 + hash(x, y, 423) * 0.3);
};

// lit amethyst: the same violet, with veins of pale light running through it and a bright core
const litAmethyst: Painter = (x, y) => {
  const vein = Math.abs(Math.sin((x + blob(x, y, 431, 4) * 6) * 0.9) + Math.cos((y + blob(y, x, 432, 4) * 6) * 0.7)) < 0.28;
  if (vein) return pick(GLOW, hash(x, y, 433));
  if (edge(x, y)) return pick(AMETHYST_LIGHT, 0.4 + hash(x, y, 434) * 0.6);
  const d = Math.hypot(x - 7.5, y - 7.5);
  if (d < 2.2) return pick(GLOW, hash(x, y, 435) * 0.6);
  return pick(AMETHYST, 0.25 + facet(x, y, 436) * 0.55 + hash(x, y, 437) * 0.2);
};

// the crystal of the clusters (on their boxes): a clear lilac with a lighter streak up each face, darker at the root
const CRYSTAL = ['#8e62d0', '#9f74de', '#b38ae9', '#c7a3f3', '#7a50bf'];
const crystal: Painter = (x, y) => {
  if ((x + (y >> 2)) % 5 === 0) return pick(GLOW, hash(x, y, 441) * 0.8); // the bright streak along a face
  const depth = y / 18; // darker near the bottom of the tile (the root of the crystal)
  return pick(CRYSTAL, Math.min(0.99, Math.max(0, 0.75 - depth * 0.6 + hash(x, y, 442) * 0.35)));
};

// the great crystal's own block (its base, under the renderer's tall crystal): paler, colder, almost white at the facets
const GREAT = ['#b9a2ef', '#c9b6f6', '#a68be6', '#d8ccfb', '#9a7fdc'];
const greatCrystal: Painter = (x, y) => {
  if (edge(x, y)) return hex('#f2ecff');
  return pick(GREAT, facet(x, y, 451) * 0.6 + hash(x, y, 452) * 0.4);
};

// the raw crystal shard (item icon): a short, broken crystal standing on its slant, lilac with a white glint
const SHARD = [
  '................',
  '..........o.....',
  '.........oWo....',
  '........oLMo....',
  '........oLMDo...',
  '.......oLMMDo...',
  '.......oLMVDo...',
  '......oLMVVDdo..',
  '......oLMVvDdo..',
  '.....oLMMVvDdo..',
  '.....oLMVvDdo...',
  '....oLMVvDdo....',
  '....oMVvDdo.....',
  '....oovDdoo.....',
  '......ooo.......',
  '................',
];
const SHARD_INK: Record<string, string> = { o: '#1e1436', L: '#efe4ff', M: '#c6a6f5', D: '#7c55c9', d: '#5a3a9e', V: '#a982ea', v: '#8a62d6', W: '#ffffff' };
const crystalShardRaw: Painter = (x, y): Rgba => {
  const c = SHARD[y]?.[x];
  return c && c !== '.' ? hex(SHARD_INK[c]) : CLEAR;
};

export const CRYSTAL_GEODES_ART: Record<string, Painter> = {
  geode_basalt: geodeBasalt,
  calcite,
  amethyst_block: amethyst,
  lit_amethyst: litAmethyst,
  crystal_cluster: crystal,
  great_crystal: greatCrystal,
  crystal_shard_raw: crystalShardRaw,
};
