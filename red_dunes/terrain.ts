// @ts-check
// The terrain step of the Dunas Vermelhas: rolling dunes over the base game's ground, only in columns of the biome.
// A pure function of WORLD coordinates (api.noise2 / api.biomeAt): every chunk agrees on every column, whatever order chunks
// are generated in, so a dune runs on across a chunk border without a seam.
//   - the dunes: long ridges across one wind direction, their line bent by a slow noise, their height varying along them,
//     with a small ripple on top; they only ADD ground (never dig below the base height);
//   - the fade: a coarse lattice (every 8 blocks, aligned to the world) samples the biome around the chunk, each lattice node
//     averages its neighbourhood (radius 8) and each column interpolates between nodes, so the dunes fade out towards the
//     biome's edge instead of ending in a wall;
//   - the coast: near the sea the dunes fade too (the beaches stay beaches), and nothing rises into the snow line.
import { ns } from '../src/names.ts';
import { biomeAbsent } from '../src/blend.ts';

const BIOME = ns('red_dunes');
const SEA = 30; // the base game's sea level (packages/shared/src/constants.ts SEA_LEVEL): written here, content must not import engine tables
const CS = 16, STEP = 8, PAD = 8, N = (CS + 2 * PAD) / STEP + 1; // lattice: x0-8 .. x0+24 every 8 blocks -> 5 x 5 nodes
const SMOOTH = 1; // lattice nodes on each side averaged into a node's weight (1 x 8 = 8 blocks)

// dune shape (noise salts are fixed: changing any of these changes the world and needs a new worldgenVersion)
const WAVE = 26; // blocks between two crests
const WIND_X = 0.8, WIND_Z = 0.6; // the direction the crests run across
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// terrain 2: the blend weight (0..1, the dunes' share within ~20 blocks) where the dunes start, and over how much they grow
const BLEND_FROM = 0.2, BLEND_SPAN = 0.55;

/** The dune height to ADD at a world column (0..~7), before the fade. */
export function duneLift(api: any, wx: number, wz: number) {
  const amp = 4.6 + 2.6 * api.noise2(1, wx / 150, wz / 150); // ~2..7 blocks, varying along the ridges
  const bend = api.noise2(2, wx / 70, wz / 70) * 2.2; // the crests meander
  const u = (wx * WIND_X + wz * WIND_Z) / WAVE + bend;
  const ridge = Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * u), 1.3);
  const ripple = 0.5 + 0.5 * api.noise2(3, wx / 11, wz / 11);
  return Math.max(0, amp * ridge + ripple * 0.9);
}

/**
 * Terrain 2 (the engine blends biome borders: api.biomeWeight exists): the dunes grow with the biome's blend weight, so they
 * rise out of the neighbouring ground over the border band (and the neighbour's edge gets low dunes too: no wall either side).
 */
export function shapeRedDunesBlended(api: any) {
  if (biomeAbsent(api, BIOME)) return; // nothing of the biome in this chunk (src/blend.ts)
  for (let lz = 0; lz < CS; lz++) {
    for (let lx = 0; lx < CS; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      const fade = smooth((api.biomeWeight(wx, wz, BIOME) - BLEND_FROM) / BLEND_SPAN);
      if (fade <= 0) continue;
      const base = api.baseHeight(lx, lz);
      const coast = smooth((base - (SEA + 3)) / 5);
      if (coast <= 0) continue;
      const h = Math.min(Math.max(base, SEA + 29), base + Math.round(duneLift(api, wx, wz) * fade * coast));
      if (h !== base) api.setHeight(lx, lz, h);
    }
  }
}

/** @param {any} api the terrain api (setHeight/baseHeight/noise2/biomeAt [/ biomeWeight in terrain 2]) */
export function shapeRedDunes(api: any) {
  if (api.biomeWeight) { shapeRedDunesBlended(api); return; }
  const gx0 = api.x0 - PAD, gz0 = api.z0 - PAD;
  const inside = new Float32Array(N * N);
  let any = false;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (api.biomeAt(gx0 + i * STEP, gz0 + j * STEP) === BIOME) { inside[j * N + i] = 1; any = true; }
  }
  if (!any) return;
  // each node's weight: the share of the biome in its neighbourhood (only the nodes the columns interpolate between)
  const weight = new Float32Array(N * N);
  for (let j = SMOOTH; j < N - SMOOTH; j++) for (let i = SMOOTH; i < N - SMOOTH; i++) {
    let s = 0;
    for (let dj = -SMOOTH; dj <= SMOOTH; dj++) for (let di = -SMOOTH; di <= SMOOTH; di++) s += inside[(j + dj) * N + i + di];
    weight[j * N + i] = s / ((2 * SMOOTH + 1) * (2 * SMOOTH + 1));
  }
  for (let lz = 0; lz < CS; lz++) {
    for (let lx = 0; lx < CS; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      // terrain 1: only the biome's own columns move (what the step's `biomes` filter did before terrain 2 needed the
      // neighbours' edge too: the same columns, so terrain-1 worlds are byte-identical)
      if (api.biomeAt(wx, wz) !== BIOME) continue;
      // bilinear weight between the four lattice nodes around the column
      const fx = (lx + PAD) / STEP, fz = (lz + PAD) / STEP, i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
      const w = (weight[j * N + i] * (1 - tx) + weight[j * N + i + 1] * tx) * (1 - tz) + (weight[(j + 1) * N + i] * (1 - tx) + weight[(j + 1) * N + i + 1] * tx) * tz;
      const fade = smooth((w - 0.3) / 0.45);
      if (fade <= 0) continue;
      const base = api.baseHeight(lx, lz);
      const coast = smooth((base - (SEA + 3)) / 5);
      if (coast <= 0) continue;
      const h = Math.min(Math.max(base, SEA + 29), base + Math.round(duneLift(api, wx, wz) * fade * coast));
      if (h !== base) api.setHeight(lx, lz, h);
    }
  }
}
