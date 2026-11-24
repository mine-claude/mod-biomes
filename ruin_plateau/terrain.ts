// @ts-check
// The terrain step of the Planalto das Ruínas: it raises the land into a high rocky plateau — a raised table everywhere in the
// biome, then terraces and mesas standing on it, their rims dropping in cliffs of a few blocks.
// A pure function of WORLD coordinates (api.noise2 / api.biomeAt): every chunk agrees on every column, whatever order chunks are
// generated in, so a mesa runs on across a chunk border without a seam.
//   - the lift: a plateau of 3..5 blocks, plus a terrace (+4) and a mesa top (+5) where a slow noise passes two thresholds; the
//     threshold window is narrow (a cliff a column or two wide) and a quicker noise makes the rims ragged;
//   - the fade: the biome sampled on a GLOBAL grid every 4 blocks, "how much plateau is around" (+-12 blocks) interpolated per
//     column, scales the whole lift: the plateau ramps up from its border instead of standing on it like a wall. No `biomes`
//     filter (like the Brejo Luminoso): at a ragged border the pockets of the next biome inside the ramp rise with it;
//   - the water stays water: the lift fades in over the first blocks above the sea, so the plateau meets the sea in steep
//     shore cliffs; nothing rises into the snow line (sea + 32): the tops flatten there.
import { ns } from '../src/names.ts';
import { biomeAbsent } from '../src/blend.ts';

const BIOME = ns('ruin_plateau');
export const SEA = 30; // the base world's sea level (packages/shared/src/constants.ts SEA_LEVEL): content must not import engine tables
export const TOP = SEA + 31; // the highest ground the plateau makes (the base game puts snow from sea + 32 up)
const GRID = 4, RADIUS = 3; // the biome is sampled every 4 blocks; "inside" averages 7 x 7 grid points (+-12 blocks)
const INNER = 16 / GRID + 1;
const SPAN = INNER + 2 * RADIUS;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (t: number) => t * t * (3 - 2 * t);
// terrain 2: the blend weight (0..1, the plateau's share within ~20 blocks) where the lift starts, and over how much it grows
const BLEND_FROM = 0.2, BLEND_SPAN = 0.6;

/** The full lift (before the fade) at a world column: 3..14 blocks. Pure. */
export function plateauLift(api: any, wx: number, wz: number) {
  const rim = api.noise2(14, wx / 9, wz / 9) * 0.05; // ragged rims
  const m = api.noise2(11, wx / 85, wz / 85) * 0.8 + api.noise2(12, wx / 33, wz / 33) * 0.28 + rim;
  let lift = 4 + Math.round(api.noise2(13, wx / 60, wz / 60)); // the plateau: 3..5, rolling slowly
  lift += Math.round(4 * clamp((m + 0.06) / 0.008, 0, 1)); // the terrace (most of the plateau)
  lift += Math.round(5 * clamp((m - 0.13) / 0.008, 0, 1)); // the mesas on it (about a fifth)
  return lift;
}

/** The share (0..1) of the biome around a world column: the global 4-block grid, +-12 blocks, interpolated. Pure. */
export function plateauShare(api: any, wx: number, wz: number) {
  const gx = Math.floor(wx / GRID), gz = Math.floor(wz / GRID), fx = (wx - gx * GRID) / GRID, fz = (wz - gz * GRID) / GRID;
  const at = (i: number, j: number) => {
    let n = 0;
    for (let dj = -RADIUS; dj <= RADIUS; dj++) for (let di = -RADIUS; di <= RADIUS; di++) if (api.biomeAt((i + di) * GRID, (j + dj) * GRID) === BIOME) n++;
    return n / ((2 * RADIUS + 1) * (2 * RADIUS + 1));
  };
  return (at(gx, gz) * (1 - fx) + at(gx + 1, gz) * fx) * (1 - fz) + (at(gx, gz + 1) * (1 - fx) + at(gx + 1, gz + 1) * fx) * fz;
}

/** How much of the lift a column with this share gets (0..1). */
export const fadeOf = (share: number) => smooth(clamp((share - 0.4) / 0.5, 0, 1));

/**
 * Terrain 2 (the engine blends biome borders: api.biomeWeight exists): the lift grows with the biome's blend weight, so the
 * plateau ramps up from its border band; the terraces and mesas on top keep their cliffs.
 */
export function shapePlateauBlended(api: any) {
  if (biomeAbsent(api, BIOME)) return; // nothing of the biome in this chunk (src/blend.ts)
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      const w = smooth(clamp((api.biomeWeight(wx, wz, BIOME) - BLEND_FROM) / BLEND_SPAN, 0, 1));
      if (w <= 0) continue;
      const base = api.height(lx, lz);
      const coast = smooth(clamp((base - SEA) / 5, 0, 1));
      if (coast <= 0) continue;
      const h = Math.min(Math.max(base, TOP), base + Math.round(plateauLift(api, wx, wz) * w * coast));
      if (h !== base) api.setHeight(lx, lz, h);
    }
  }
}

/** @param {any} api the terrain api (setHeight / height / noise2 / biomeAt [/ biomeWeight in terrain 2]) */
export function shapePlateau(api: any) {
  if (api.biomeWeight) { shapePlateauBlended(api); return; }
  const gx0 = Math.floor(api.x0 / GRID) - RADIUS, gz0 = Math.floor(api.z0 / GRID) - RADIUS;
  const inside = new Uint8Array(SPAN * SPAN);
  let any = 0;
  for (let j = 0; j < SPAN; j++) {
    for (let i = 0; i < SPAN; i++) {
      const v = api.biomeAt((gx0 + i) * GRID, (gz0 + j) * GRID) === BIOME ? 1 : 0;
      inside[j * SPAN + i] = v; any |= v;
    }
  }
  if (!any) return; // no plateau near this chunk (and every chunk of a world without biomes)
  // the same numbers as plateauShare, from the grid read once for the chunk
  const share = new Float32Array(INNER * INNER), full = (2 * RADIUS + 1) * (2 * RADIUS + 1);
  for (let j = 0; j < INNER; j++) {
    for (let i = 0; i < INNER; i++) {
      let n = 0;
      for (let dj = 0; dj <= 2 * RADIUS; dj++) for (let di = 0; di <= 2 * RADIUS; di++) n += inside[(j + dj) * SPAN + i + di];
      share[j * INNER + i] = n / full;
    }
  }
  const bx = Math.floor(api.x0 / GRID), bz = Math.floor(api.z0 / GRID);
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      const gx = Math.floor(wx / GRID), gz = Math.floor(wz / GRID), fx = (wx - gx * GRID) / GRID, fz = (wz - gz * GRID) / GRID;
      const i = gx - bx, j = gz - bz;
      const s = (share[j * INNER + i] * (1 - fx) + share[j * INNER + i + 1] * fx) * (1 - fz) + (share[(j + 1) * INNER + i] * (1 - fx) + share[(j + 1) * INNER + i + 1] * fx) * fz;
      const w = fadeOf(s);
      if (w <= 0) continue;
      const base = api.height(lx, lz);
      const coast = smooth(clamp((base - SEA) / 5, 0, 1)); // the water stays water; from the shore up the plateau rises fast (sea cliffs)
      if (coast <= 0) continue;
      const h = Math.min(Math.max(base, TOP), base + Math.round(plateauLift(api, wx, wz) * w * coast));
      if (h !== base) api.setHeight(lx, lz, h);
    }
  }
}
