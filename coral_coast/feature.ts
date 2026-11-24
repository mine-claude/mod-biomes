// @ts-check
// The decoration step of the Costa de Corais. Runs once per chunk whose centre is in the biome (the step's `biomes` filter)
// and then asks the biome of EACH column it writes to, so a chunk on the edge only decorates its coral side.
// Pure: only api.rand / api.get / api.set / api.heightAt / api.biomeAt; every api.rand gets WORLD coordinates (the column's,
// or the chunk origin's for the per-chunk draws). Everything it writes stays inside this chunk.
//
// The biome is a climate band (warm and humid) like any other, so it meets the real sea wherever the base terrain has a coast.
// The base game re-surfaces only GRASS columns with a biome's floor (inland: shell sand); the beach and the sea floor stay
// sand, gravel and clay — this step is what makes them a coral coast:
//   - the beach: sand becomes shell sand in broad patches, seashells (Concha) lie on it, driftwood washes up, tide pools
//     (a pocket of water one block deep, ringed by rocks, a coral or two on its floor) open in the flat sand;
//   - the shallow sea (1..6 deep): coral reefs grow on the floor — mounds of coral block and brain coral. Where a mound
//     reaches the surface its crest carries the branching, fan and tube corals, standing in the air just above the water;
//   - palms (curved trunk of palm logs, a crown of fronds, coconuts) on the sand, and now and then a giant clam on the
//     shore or on a reef crest.
//
// WHY the non-cube corals never stand IN the water: the engine has no waterlogging — a cell holds one block. A coral in a
// cell that was water leaves that cell without water, and the mesher draws the faces of the water around it (water shows its
// faces against anything that is not a full cube or water): a box of "air" around every coral. A FULL cube in the water is
// clean (the water's faces against it are culled), so everything under the surface is made of cube corals, and the shaped
// corals stand on top of the mounds that reach the surface. The same goes for the giant clam and the seashells: dry cells only.
import { ns } from '../src/names.ts';

const BIOME = ns('coral_coast');
export const SEA = 30; // the base world's sea level (packages/shared/src/constants.ts SEA_LEVEL): water fills h+1..SEA
const SHELL_SAND = ns('shell_sand'), CORAL = ns('coral_block'), BRAIN = ns('brain_coral_block');
const BRANCH = ns('branch_coral'), FAN = ns('fan_coral'), TUBE = ns('tube_coral'), SEASHELL = ns('seashell');
const PALM_LOG = ns('palm_log'), PALM_LEAVES = ns('palm_leaves'), FROND = ns('palm_frond'), COCONUT = ns('coconut');
const DRIFT = ns('driftwood'), CLAM = ns('giant_clam');
const AIR = 'mineclaude:air', WATER = 'mineclaude:water', SAND = 'mineclaude:sand';
const COBBLE = 'mineclaude:cobblestone', STONE = 'mineclaude:stone';
const SANDY = new Set([SAND, SHELL_SAND]);
const SEA_FLOOR = new Set([SAND, 'mineclaude:gravel', 'mineclaude:clay']);
const CREST = [BRANCH, FAN, TUBE];

// odds (the api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const SHELL_SAND_PATCH = 0.32, SEASHELL_ON_BEACH = 0.035, SEASHELL_INLAND = 0.005;
const REEF_DEPTH = 6, REEF_AT = 0.5, CREST_CORAL = 0.6;
const POOL = 0.5, POOL_TRIES = 8, DRIFT_CHANCE = 0.45, DRIFT_TRIES = 6, PALM = 0.6, PALM_TRIES = 8, CLAM_CHANCE = 0.2;
const PATCH = 5; // the reef and the shell-sand patches: a value noise on a lattice of 5 blocks

/** A smooth value noise (0..1) from api.rand on a lattice of world coordinates: neighbouring chunks agree. */
function patch(api: any, salt: number, wx: number, wz: number) {
  const gx = Math.floor(wx / PATCH), gz = Math.floor(wz / PATCH), fx = (wx - gx * PATCH) / PATCH, fz = (wz - gz * PATCH) / PATCH;
  const at = (i: number, j: number) => api.rand(salt, i, 0, j);
  const a = at(gx, gz), b = at(gx + 1, gz), c = at(gx, gz + 1), d = at(gx + 1, gz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

type Cell = [number, number, number, string]; // lx, y, lz, block

/** Writes a whole piece only when every cell is inside the chunk and in a column of the biome (else nothing). */
function placeAll(api: any, cells: Cell[]) {
  const seen = new Set<number>();
  for (const [lx, , lz] of cells) {
    if (lx < 0 || lx > 15 || lz < 0 || lz > 15) return false;
    const k = lx * 16 + lz;
    if (seen.has(k)) continue;
    seen.add(k);
    if (api.biomeAt(api.x0 + lx, api.z0 + lz) !== BIOME) return false;
  }
  for (const [lx, y, lz, b] of cells) api.set(lx, y, lz, b);
  return true;
}

/** @param {any} api the feature api */
export function decorateCoralCoast(api: any) {
  const x0 = api.x0, z0 = api.z0;
  const inBiome = new Uint8Array(256), height = new Int16Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
    const wx = x0 + lx, wz = z0 + lz;
    inBiome[lx * 16 + lz] = api.biomeAt(wx, wz) === BIOME ? 1 : 0;
    height[lx * 16 + lz] = api.heightAt(wx, wz);
  }
  const H = (lx: number, lz: number) => height[lx * 16 + lz];

  // ---- per column: the beach floor, seashells, and the reefs of the shallow sea
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      if (!inBiome[lx * 16 + lz]) continue;
      const wx = x0 + lx, wz = z0 + lz, h = H(lx, lz);
      const top = api.get(lx, h, lz);
      if (top === null) continue;
      if (h >= SEA) {
        // dry land: the beach sand turns to shell sand in broad patches, seashells lie about
        if (!SANDY.has(top)) continue;
        let floor = top;
        // (only the beach: inland sand is the base game's desert edge, left as it is)
        if (top === SAND && h <= SEA + 2 && patch(api, 201, wx, wz) > SHELL_SAND_PATCH) { api.set(lx, h, lz, SHELL_SAND); floor = SHELL_SAND; }
        if (api.get(lx, h + 1, lz) !== AIR) continue;
        const odds = h <= SEA + 2 ? SEASHELL_ON_BEACH : SEASHELL_INLAND;
        if (floor && api.rand(202, wx, h, wz) < odds) api.set(lx, h + 1, lz, SEASHELL);
        continue;
      }
      // under water: a reef where the reef noise is high, only in the shallows
      const depth = SEA - h;
      if (depth > REEF_DEPTH || !SEA_FLOOR.has(top) || api.get(lx, h + 1, lz) !== WATER) continue;
      const r = patch(api, 203, wx, wz);
      if (r < REEF_AT) continue;
      // the mound: 1..6 blocks over the floor, the higher the noise the taller; it may reach the surface (y = SEA)
      const mound = 1 + Math.floor(((r - REEF_AT) / (1 - REEF_AT)) * 6 + api.rand(204, wx, 0, wz) * 1.5);
      const reefTop = Math.min(SEA, h + mound);
      const brainy = patch(api, 205, wx + 1000, wz) > 0.55;
      for (let y = h; y <= reefTop; y++) {
        const brain = brainy ? y >= reefTop - 1 || api.rand(206, wx, y, wz) < 0.5 : api.rand(206, wx, y, wz) < 0.12;
        api.set(lx, y, lz, brain ? BRAIN : CORAL);
      }
      // a crest at the surface: a shaped coral stands on it, in the air just above the water
      if (reefTop === SEA && api.get(lx, SEA + 1, lz) === AIR && api.rand(207, wx, SEA, wz) < CREST_CORAL) {
        api.set(lx, SEA + 1, lz, CREST[Math.floor(api.rand(208, wx, SEA, wz) * CREST.length)]);
      }
    }
  }

  // ---- tide pools: a pocket of water one block deep in flat dry sand, ringed by rocks
  // (each per-chunk draw tries a few candidate spots, salted with the chunk origin + the try: x0 + t stays inside this
  // chunk's own range of x, so no two chunks share a draw)
  if (api.rand(210, x0, 0, z0) < POOL) {
    for (let t = 0; t < POOL_TRIES; t++) {
      const cx = 3 + Math.floor(api.rand(212, x0 + t, 0, z0) * 10), cz = 3 + Math.floor(api.rand(214, x0 + t, 0, z0) * 10);
      const h = H(cx, cz);
      if (h < SEA || h > SEA + 2) continue;
      // the pocket: a plus, and the corners of a 3 x 3 now and then
      const pool: Array<[number, number]> = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (api.rand(216, x0 + cx + dx, t, z0 + cz + dz) < 0.5) pool.push([dx, dz]);
      const inPool = new Set(pool.map(([dx, dz]) => dx * 8 + dz));
      const ring: Array<[number, number]> = [];
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        if (inPool.has(dx * 8 + dz)) continue;
        if (pool.some(([px, pz]) => Math.abs(px - dx) <= 1 && Math.abs(pz - dz) <= 1)) ring.push([dx, dz]);
      }
      // flat sand under the pocket (the water takes the place of the top block, so the ground's top stays where heightAt
      // says it is), nothing lower around it — the water must have a wall on every side
      let ok = pool.every(([dx, dz]) => H(cx + dx, cz + dz) === h && SANDY.has(api.get(cx + dx, h, cz + dz)));
      ok = ok && ring.every(([dx, dz]) => H(cx + dx, cz + dz) >= h);
      if (!ok) continue;
      const cells: Cell[] = [];
      for (const [dx, dz] of pool) {
        const x = cx + dx, z = cz + dz, wx = x0 + x, wz = z0 + z;
        cells.push([x, h, z, WATER], [x, h + 1, z, AIR]);
        const k = api.rand(218, wx, h, wz);
        cells.push([x, h - 1, z, k < 0.22 ? BRAIN : k < 0.45 ? CORAL : SAND]); // the pool's floor: sand and a coral or two
      }
      for (const [dx, dz] of ring) {
        const x = cx + dx, z = cz + dz, wx = x0 + x, wz = z0 + z;
        if (H(x, z) !== h) continue; // a higher neighbour is its own wall
        cells.push([x, h, z, api.rand(219, wx, h, wz) < 0.7 ? COBBLE : STONE]);
        const above = api.get(x, h + 1, z);
        if (above === AIR || above === SEASHELL) cells.push([x, h + 1, z, api.rand(220, wx, h, wz) < 0.3 ? COBBLE : AIR]);
      }
      if (placeAll(api, cells)) break;
    }
  }

  // ---- driftwood: a weathered log of 2..3 blocks lying along x on the beach
  if (api.rand(230, x0, 0, z0) < DRIFT_CHANCE) {
    for (let t = 0; t < DRIFT_TRIES; t++) {
      const lx = 1 + Math.floor(api.rand(231, x0 + t, 0, z0) * 11), lz = 1 + Math.floor(api.rand(232, x0 + t, 0, z0) * 14);
      const len = 2 + Math.floor(api.rand(233, x0 + t, 0, z0) * 2), h = H(lx, lz);
      let ok = h >= SEA && h <= SEA + 2;
      for (let k = 0; ok && k < len; k++) ok = H(lx + k, lz) === h && SANDY.has(api.get(lx + k, h, lz)) && api.get(lx + k, h + 1, lz) === AIR;
      if (ok && placeAll(api, Array.from({ length: len }, (_, k) => [lx + k, h + 1, lz, DRIFT] as Cell))) break;
    }
  }

  // ---- palms: a curved trunk leaning one way, a crown of fronds that droop at the ends, coconuts under it. The base is kept
  // 5 blocks off the chunk's edges (lean up to 2 + crown 3) so the whole tree is in this chunk.
  const palms = api.rand(240, x0, 0, z0) < PALM ? (api.rand(241, x0, 0, z0) < 0.4 ? 2 : 1) : 0;
  let grown = 0;
  for (let t = 0; t < PALM_TRIES && grown < palms; t++) {
    const bx = 5 + Math.floor(api.rand(242, x0 + t, 0, z0) * 6), bz = 5 + Math.floor(api.rand(244, x0 + t, 0, z0) * 6);
    const h = H(bx, bz);
    if (h < SEA || h > SEA + 6 || !SANDY.has(api.get(bx, h, bz)) || api.get(bx, h + 1, bz) !== AIR) continue;
    const tall = 5 + Math.floor(api.rand(246, x0 + t, 0, z0) * 4);
    const dir = Math.floor(api.rand(248, x0 + t, 0, z0) * 4), lean = 1 + Math.floor(api.rand(250, x0 + t, 0, z0) * 2);
    const ldx = dir === 0 ? 1 : dir === 1 ? -1 : 0, ldz = dir === 2 ? 1 : dir === 3 ? -1 : 0;
    const cells: Cell[] = [];
    // the trunk bends more and more towards the top: offset(k) = lean * (k / tall)^2; where it steps over, the block of the
    // step is doubled (old and new column at the same height), so the trunk stays connected — a curve made of blocks
    let prev = 0;
    for (let k = 1; k <= tall; k++) {
      const off = Math.round(lean * (k / tall) ** 2);
      if (off !== prev) cells.push([bx + ldx * prev, h + k, bz + ldz * prev, PALM_LOG]);
      cells.push([bx + ldx * off, h + k, bz + ldz * off, PALM_LOG]);
      prev = off;
    }
    const tx = bx + ldx * prev, tz = bz + ldz * prev, ty = h + tall;
    cells.push([tx, ty + 1, tz, PALM_LEAVES]);
    for (let d = 0; d < 8; d++) {
      const dx = [1, -1, 0, 0, 1, 1, -1, -1][d], dz = [0, 0, 1, -1, 1, -1, 1, -1][d];
      if (d < 4) {
        // the long fronds: two out at the crown's height, a third one lower, the tip hanging under it
        cells.push([tx + dx, ty + 1, tz + dz, PALM_LEAVES], [tx + dx * 2, ty + 1, tz + dz * 2, PALM_LEAVES], [tx + dx * 3, ty, tz + dz * 3, PALM_LEAVES]);
        cells.push([tx + dx * 3, ty - 1, tz + dz * 3, FROND]);
      } else {
        // the short ones, between: one out, then down
        cells.push([tx + dx, ty + 1, tz + dz, PALM_LEAVES], [tx + dx * 2, ty, tz + dz * 2, PALM_LEAVES], [tx + dx * 2, ty - 1, tz + dz * 2, FROND]);
      }
    }
    // coconuts hang under the crown, next to the top of the trunk
    for (let d = 0; d < 4; d++) {
      const dx = [1, -1, 0, 0][d], dz = [0, 0, 1, -1][d];
      if (api.rand(252 + d, x0 + t, 0, z0) < 0.4) cells.push([tx + dx, ty, tz + dz, COCONUT]);
    }
    // only into air (a palm never cuts into the ground or another palm; a seashell under it is simply covered)
    if (cells.every(([x, y, z]) => { const b = api.get(x, y, z); return b === AIR || b === SEASHELL; }) && placeAll(api, cells)) grown++;
  }

  // ---- a giant clam: on the shore at the water's edge, or on a reef crest at the surface
  if (api.rand(260, x0, 0, z0) < CLAM_CHANCE) {
    for (let k = 0; k < 8; k++) {
      const lx = Math.floor(api.rand(261 + k, x0, 0, z0) * 16), lz = Math.floor(api.rand(270 + k, x0, 0, z0) * 16);
      const h = H(lx, lz);
      const crest = h < SEA && (api.get(lx, SEA, lz) === CORAL || api.get(lx, SEA, lz) === BRAIN);
      const y = crest ? SEA + 1 : h + 1;
      const below = api.get(lx, y - 1, lz);
      if (api.get(lx, y, lz) !== AIR || api.get(lx, y + 1, lz) !== AIR) continue;
      const shore = !crest && (h === SEA || h === SEA + 1) && SANDY.has(below);
      if (!crest && !shore) continue;
      if (placeAll(api, [[lx, y, lz, CLAM]])) break;
    }
  }
}
