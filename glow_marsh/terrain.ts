// @ts-check
// The terrain step of the Brejo Luminoso: it brings the land of the marsh down to the water line, with shallow pools and
// winding channels. The base game's sea stage fills every column lower than the sea level with water (it reads the height
// AFTER the terrain steps), so a column lowered below it becomes a pool by itself — no water is placed by hand.
//
// Pure function of WORLD coordinates (the chunk's own neighbours read these heights for trees and rivers, and the result
// must not depend on the order chunks are born in):
//   - how "deep inside" the marsh a column is comes from the biome sampled on a GLOBAL grid (every GRID blocks), averaged
//     over RADIUS grid points around each point and interpolated between them: the lowering fades in from the border, so
//     there is no cliff where the marsh meets another biome. Only columns whose neighbourhood is mostly marsh move (share > 0.45):
//     the marsh and, at a ragged border, a fringe of a few blocks of the biome next to it (no `biomes` filter, see index.ts);
//   - the height it aims at is the sea level plus a slow roll, minus pools and channels: api.noise2 of world coordinates.
import { ns } from '../src/names.ts';
import { biomeAbsent } from '../src/blend.ts';

const BIOME = ns('glow_marsh');
export const SEA = 30; // the base world's sea level (packages/shared/src/constants.ts SEA_LEVEL)
const GRID = 4, RADIUS = 3; // the biome is sampled every 4 blocks; "inside" averages 7 x 7 grid points (+-12 blocks)
const INNER = 16 / GRID + 1; // grid points that cover one chunk (and the next one's first column)
const SPAN = INNER + 2 * RADIUS;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (t: number) => t * t * (3 - 2 * t);
// terrain 2: the blend weight (0..1, the marsh's share within ~20 blocks) where the lowering starts, and over how much it grows
const BLEND_FROM = 0.15, BLEND_SPAN = 0.6;

/** The height the marsh aims at in column (wx, wz) whose height is h now. Pure. */
export function marshTarget(api: any, wx: number, wz: number, h: number) {
  const pool = api.noise2(1, wx / 13, wz / 13);
  const channel = Math.abs(api.noise2(2, wx / 36, wz / 36));
  const roll = api.noise2(3, wx / 48, wz / 48);
  if (pool < -0.5) return SEA - 2; // a deeper pool
  if (pool < -0.2 || channel < 0.05) return SEA - 1; // a pool, a channel
  return Math.round(SEA + 0.4 + roll * 1.4 + clamp((h - SEA) * 0.05, -1, 1)); // the wet ground: at the water line, a hummock here and there
}

/**
 * Terrain 2 (the engine blends biome borders: api.biomeWeight exists): the marsh's share around each column is the engine's
 * blend weight, the same one its ground blocks and grass tint fade by, so the lowering ramps in over the border band.
 */
export function shapeMarshBlended(api: any) {
  if (biomeAbsent(api, BIOME)) return; // nothing of the biome in this chunk (src/blend.ts)
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      const w = smooth(clamp((api.biomeWeight(wx, wz, BIOME) - BLEND_FROM) / BLEND_SPAN, 0, 1));
      if (w <= 0) continue;
      const h = api.height(lx, lz);
      const k = w * clamp((h - (SEA - 10)) / 5, 0, 1); // the open sea stays the sea
      if (k <= 0) continue;
      const nh = Math.round(h + (marshTarget(api, wx, wz, h) - h) * k);
      if (nh !== h) api.setHeight(lx, lz, nh);
    }
  }
}

/** @param {any} api the terrain api (setHeight / height / noise2 / biomeAt [/ biomeWeight in terrain 2]) */
export function shapeMarsh(api: any) {
  if (api.biomeWeight) { shapeMarshBlended(api); return; }
  const gx0 = Math.floor(api.x0 / GRID) - RADIUS, gz0 = Math.floor(api.z0 / GRID) - RADIUS;
  const inMarsh = new Uint8Array(SPAN * SPAN);
  let any = 0;
  for (let j = 0; j < SPAN; j++) {
    for (let i = 0; i < SPAN; i++) {
      const v = api.biomeAt((gx0 + i) * GRID, (gz0 + j) * GRID) === BIOME ? 1 : 0;
      inMarsh[j * SPAN + i] = v; any |= v;
    }
  }
  if (!any) return; // no marsh near this chunk (and every chunk of a world without biomes)
  // how much of the neighbourhood of each inner grid point is marsh (0..1)
  const share = new Float32Array(INNER * INNER), full = (2 * RADIUS + 1) * (2 * RADIUS + 1);
  for (let j = 0; j < INNER; j++) {
    for (let i = 0; i < INNER; i++) {
      let n = 0;
      for (let dj = 0; dj <= 2 * RADIUS; dj++) for (let di = 0; di <= 2 * RADIUS; di++) n += inMarsh[(j + dj) * SPAN + i + di];
      share[j * INNER + i] = n / full;
    }
  }
  const bx = Math.floor(api.x0 / GRID), bz = Math.floor(api.z0 / GRID);
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      const gx = Math.floor(wx / GRID), gz = Math.floor(wz / GRID), fx = (wx - gx * GRID) / GRID, fz = (wz - gz * GRID) / GRID;
      const i = gx - bx, j = gz - bz;
      const s00 = share[j * INNER + i], s10 = share[j * INNER + i + 1], s01 = share[(j + 1) * INNER + i], s11 = share[(j + 1) * INNER + i + 1];
      const s = (s00 * (1 - fx) + s10 * fx) * (1 - fz) + (s01 * (1 - fx) + s11 * fx) * fz;
      const w = smooth(clamp((s - 0.45) / 0.4, 0, 1));
      if (w <= 0) continue;
      const h = api.height(lx, lz);
      const deep = clamp((h - (SEA - 10)) / 5, 0, 1); // the open sea stays the sea: only shallow water is raised to a marsh
      const k = w * deep;
      if (k <= 0) continue;
      const nh = Math.round(h + (marshTarget(api, wx, wz, h) - h) * k);
      if (nh !== h) api.setHeight(lx, lz, nh);
    }
  }
}
