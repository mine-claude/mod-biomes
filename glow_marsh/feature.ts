// @ts-check
// The decoration step of the Brejo Luminoso. Runs once per chunk whose centre is in the biome (the step's `biomes` filter)
// and then asks the biome of EACH column, so a chunk on the edge only decorates its marsh side.
// Pure: only api.rand / api.get / api.set / api.heightAt / api.biomeAt. Everything it writes stays inside this chunk (set
// outside it is ignored); it reads other chunks only through heightAt (a pure function of world coordinates), so the result
// does not depend on the order chunks are generated in.
//
// The terrain step (terrain.ts) brought the land down to the water line, so most of the marsh is shore: the base game
// gives those columns sand (the beach rule), and this step turns it into the marsh's own ground:
//   - the floor: mud (Lama) at the water and under it, peat (Turfa) in patches and under the mud, grass (tinted) on the
//     drier hummocks, with spots of mud and peat on them too;
//   - reeds (Junco, two blocks) along the water's edge; marsh pads (Folha-de-brejo) floating on the pools;
//   - glow fungus (Fungo Luminoso, a light source) on the mud and on the dead trees;
//   - drowned dead trees (Tronco Morto) standing in the shallows, bare branches with hanging moss (Barba-de-velho, from
//     the Floresta Musgosa).
import { ns } from '../src/names.ts';
import { SEA } from './terrain.ts';

const BIOME = ns('glow_marsh');
const MUD = ns('mud'), PEAT = ns('peat'), REED = ns('reed'), REED_TOP = ns('reed_top'), FUNGUS = ns('glow_fungus');
const DEAD = ns('dead_log'), PAD = ns('marsh_pad'), HANGING = ns('hanging_moss');
const AIR = 'mineclaude:air', WATER = 'mineclaude:water', GRASS = 'mineclaude:grass', TALL_GRASS = 'mineclaude:tall_grass';
const SHORE = new Set(['mineclaude:sand', 'mineclaude:gravel', 'mineclaude:clay']);
const GROUND = new Set([MUD, PEAT, GRASS]);

// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const REED_AT_WATER = 0.42, REED_ELSEWHERE = 0.03, FUNGUS_ON_GROUND = 0.025, PAD_ON_POOL = 0.11;
const DEAD_TREE_TRIES = 2, DEAD_TREE = 0.55, FUNGUS_ON_TRUNK = 0.7, HANG_UNDER_BRANCH = 0.6;
const PATCH = 6; // the mud/peat patches: a value noise on a lattice of 6 blocks

/** A smooth value noise (0..1) from api.rand on a lattice of world coordinates: neighbouring chunks agree. */
function patch(api: any, salt: number, wx: number, wz: number) {
  const gx = Math.floor(wx / PATCH), gz = Math.floor(wz / PATCH), fx = (wx - gx * PATCH) / PATCH, fz = (wz - gz * PATCH) / PATCH;
  const at = (i: number, j: number) => api.rand(salt, i, 0, j);
  const a = at(gx, gz), b = at(gx + 1, gz), c = at(gx, gz + 1), d = at(gx + 1, gz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** @param {any} api the feature api */
export function decorateGlowMarsh(api: any) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      if (api.biomeAt(wx, wz) !== BIOME) continue;
      const h = api.heightAt(wx, wz);
      const top = api.get(lx, h, lz);
      if (top === null) continue;
      const p = patch(api, 21, wx, wz);
      // the floor
      let floor = top;
      if (SHORE.has(top)) {
        floor = h >= SEA && p < 0.3 ? PEAT : MUD;
        api.set(lx, h, lz, floor);
        for (let y = h - 1; y >= h - 3; y--) if (SHORE.has(api.get(lx, y, lz))) api.set(lx, y, lz, PEAT);
      } else if (top === GRASS && (p > 0.68 || p < 0.22)) {
        floor = p > 0.68 ? MUD : PEAT;
        api.set(lx, h, lz, floor);
      }
      if (!GROUND.has(floor)) continue;
      const above = api.get(lx, h + 1, lz);
      // the pools: pads float on still water one block above the floor of a 1..2 deep pool
      if (h < SEA) {
        if (above === WATER && api.get(lx, SEA, lz) === WATER && api.get(lx, SEA + 1, lz) === AIR && api.rand(22, wx, SEA, wz) < PAD_ON_POOL) api.set(lx, SEA + 1, lz, PAD);
        continue;
      }
      if (above !== AIR && above !== TALL_GRASS) continue;
      // reeds along the water's edge (a neighbour column under the water line), two blocks tall
      const wet = h <= SEA + 1 && (api.heightAt(wx + 1, wz) < SEA || api.heightAt(wx - 1, wz) < SEA || api.heightAt(wx, wz + 1) < SEA || api.heightAt(wx, wz - 1) < SEA);
      if (api.get(lx, h + 2, lz) === AIR && api.rand(23, wx, h, wz) < (wet ? REED_AT_WATER : REED_ELSEWHERE)) {
        api.set(lx, h + 1, lz, REED); api.set(lx, h + 2, lz, REED_TOP);
        continue;
      }
      // glow fungus on the bare mud and peat
      if (floor !== GRASS && api.rand(24, wx, h, wz) < FUNGUS_ON_GROUND) api.set(lx, h + 1, lz, FUNGUS);
    }
  }
  // drowned dead trees: a bleached trunk standing in the shallows or on the bank, bare branches, moss and fungus on them.
  // Kept 2 blocks off the chunk's edges so the whole tree is in this chunk.
  for (let t = 0; t < DEAD_TREE_TRIES; t++) {
    if (api.rand(30 + t, api.x0, 0, api.z0) >= DEAD_TREE) continue;
    const lx = 2 + Math.floor(api.rand(32 + t, api.x0, 0, api.z0) * 12), lz = 2 + Math.floor(api.rand(34 + t, api.x0, 0, api.z0) * 12);
    const wx = api.x0 + lx, wz = api.z0 + lz;
    if (api.biomeAt(wx, wz) !== BIOME) continue;
    const h = api.heightAt(wx, wz);
    if (h < SEA - 2 || h > SEA + 1 || !GROUND.has(api.get(lx, h, lz))) continue;
    const above = api.get(lx, h + 1, lz);
    if (above !== AIR && above !== WATER && above !== TALL_GRASS) continue;
    const topY = Math.max(h, SEA) + 3 + Math.floor(api.rand(36 + t, api.x0, 0, api.z0) * 3);
    for (let y = h + 1; y <= topY; y++) api.set(lx, y, lz, DEAD);
    if (api.rand(38 + t, api.x0, 0, api.z0) < FUNGUS_ON_TRUNK && api.get(lx, topY + 1, lz) === AIR) api.set(lx, topY + 1, lz, FUNGUS);
    // one or two bare branches near the top, 1..2 blocks out along x or z
    const branches = 1 + Math.floor(api.rand(40 + t, api.x0, 0, api.z0) * 2);
    for (let b = 0; b < branches; b++) {
      const dir = Math.floor(api.rand(42 + t * 4 + b, api.x0, 0, api.z0) * 4), len = 1 + Math.floor(api.rand(43 + t * 4 + b, api.x0, 0, api.z0) * 2);
      const dx = dir === 0 ? 1 : dir === 1 ? -1 : 0, dz = dir === 2 ? 1 : dir === 3 ? -1 : 0;
      const by = topY - b - 1;
      let ex = lx, ez = lz; // the last block of the branch
      for (let k = 1; k <= len; k++) {
        if (api.get(lx + dx * k, by, lz + dz * k) !== AIR || api.biomeAt(api.x0 + lx + dx * k, api.z0 + lz + dz * k) !== BIOME) break; // never into the next biome
        ex = lx + dx * k; ez = lz + dz * k;
        api.set(ex, by, ez, DEAD);
      }
      if (ex !== lx || ez !== lz) {
        if (api.get(ex, by - 1, ez) === AIR && api.rand(46 + t * 4 + b, api.x0, 0, api.z0) < HANG_UNDER_BRANCH) api.set(ex, by - 1, ez, HANGING);
        else if (api.get(ex, by + 1, ez) === AIR) api.set(ex, by + 1, ez, FUNGUS);
      }
    }
  }
}
