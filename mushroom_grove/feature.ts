// @ts-check
// The decoration step of the Bosque de Cogumelos Gigantes: the floor (small mushrooms, spore puffballs), the fairy rings and
// the GIANT MUSHROOMS (a tapering stem, gills, and a cap of tiers: shapes.ts capPlan).
//
// Runs once per chunk whose centre is in the biome (the step's `biomes` filter) and then asks the biome of EACH column.
// Pure: only api.rand (always with WORLD coordinates) / get / set / heightAt / biomeAt.
// Chunk-safe by construction: a giant mushroom is drawn ENTIRELY inside its chunk — its stem stands CAP_REACH..15-CAP_REACH
// into the chunk and the widest cap reaches CAP_REACH blocks — so nothing depends on a neighbour chunk or on the order chunks
// are generated in. Small things keep off the chunk's outer ring of columns, so every neighbour they have is in this chunk.
// No non-cube block touches water (the engine has no waterlogging): every cell placed checks its six neighbours.
import { ns } from '../src/names.ts';
import { CAP_REACH, CAP_TIERS, capPlan } from './shapes.ts';

const BIOME = ns('mushroom_grove');
const SOIL = ns('mycelium_soil'), STEM = ns('mushroom_stem'), STEM_THIN = ns('mushroom_stem_thin'), SHELF = ns('shelf_stem'), GILLS = ns('mushroom_gills');
const SMALL = [ns('small_mushroom_red'), ns('small_mushroom_ochre'), ns('small_mushroom_glow')];
const PUFF = ns('spore_puffball');
const AIR = 'mineclaude:air', WATER = 'mineclaude:water', TALL_GRASS = 'mineclaude:tall_grass';
const SOFT = new Set([AIR, TALL_GRASS, ...SMALL]); // what a giant mushroom may grow through
const COLOURS = ['red', 'ochre', 'violet'] as const;
const capName = (c: string, part: string) => ns(part === 'body' ? `mushroom_cap_${c}` : part === 'dome' ? `mushroom_cap_${c}_top` : part.length === 1 ? `mushroom_cap_${c}_edge_${part}` : `mushroom_cap_${c}_corner_${part}`);
const PLANS = { small: capPlan(CAP_TIERS.small), large: capPlan(CAP_TIERS.large) };

// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const SMALL_ON_SOIL = 0.045, PUFF_ON_SOIL = 0.004, RING_IN_CHUNK = 0.3, RING_GAP = 0.15;
const GIANT_IN_CELL = 0.72, LARGE = 0.4, RED = 0.45, OCHRE = 0.8, SHELF_LARGE = 0.6, SHELF_SMALL = 0.25, GLOW_AT_VIOLET = 0.5;
const PATCH = 7; // which small mushroom grows where: a value noise on a lattice of 7 blocks

/** A smooth value noise (0..1) from api.rand on a lattice of world coordinates: neighbouring chunks agree. */
function patch(api: any, salt: number, wx: number, wz: number) {
  const gx = Math.floor(wx / PATCH), gz = Math.floor(wz / PATCH), fx = (wx - gx * PATCH) / PATCH, fz = (wz - gz * PATCH) / PATCH;
  const at = (i: number, j: number) => api.rand(salt, i, 0, j);
  const a = at(gx, gz), b = at(gx + 1, gz), c = at(gx, gz + 1), d = at(gx + 1, gz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** @param {any} api the feature api */
export function decorateMushroomGrove(api: any) {
  const inBiome = new Uint8Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) inBiome[lz * 16 + lx] = api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME ? 1 : 0;
  const wet = (lx: number, y: number, lz: number) => api.get(lx + 1, y, lz) === WATER || api.get(lx - 1, y, lz) === WATER || api.get(lx, y, lz + 1) === WATER
    || api.get(lx, y, lz - 1) === WATER || api.get(lx, y + 1, lz) === WATER || api.get(lx, y - 1, lz) === WATER;
  // a small thing on the soil at (lx, lz): inner columns only, in the biome, soil below, air (or tall grass) above, dry
  const floorSpot = (lx: number, lz: number) => {
    if (lx < 1 || lx > 14 || lz < 1 || lz > 14 || !inBiome[lz * 16 + lx]) return -1;
    const h = api.heightAt(api.x0 + lx, api.z0 + lz);
    if (api.get(lx, h, lz) !== SOIL) return -1;
    const above = api.get(lx, h + 1, lz);
    if (above !== AIR && above !== TALL_GRASS) return -1;
    return wet(lx, h + 1, lz) ? -1 : h + 1;
  };
  const smallKind = (wx: number, wz: number) => { const p = patch(api, 81, wx, wz); return p < 0.42 ? SMALL[0] : p < 0.78 ? SMALL[1] : SMALL[2]; };

  // the floor: small mushrooms in patches of one kind, and now and then a spore puffball
  for (let lz = 1; lz < 15; lz++) {
    for (let lx = 1; lx < 15; lx++) {
      const y = floorSpot(lx, lz);
      if (y < 0) continue;
      const wx = api.x0 + lx, wz = api.z0 + lz, r = api.rand(82, wx, y, wz);
      if (r < SMALL_ON_SOIL) api.set(lx, y, lz, smallKind(wx, wz));
      else if (r < SMALL_ON_SOIL + PUFF_ON_SOIL) api.set(lx, y, lz, PUFF);
    }
  }

  // a fairy ring: a circle of small mushrooms of one kind, a few missing
  if (api.rand(83, api.x0, 0, api.z0) < RING_IN_CHUNK) {
    const cx = 4 + Math.floor(api.rand(84, api.x0, 0, api.z0) * 8), cz = 4 + Math.floor(api.rand(85, api.x0, 0, api.z0) * 8);
    const rad = 3 + Math.floor(api.rand(86, api.x0, 0, api.z0) * 2);
    const kind = SMALL[Math.floor(api.rand(87, api.x0, 0, api.z0) * 3)];
    const done = new Set<number>();
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2, lx = Math.round(cx + Math.cos(a) * rad), lz = Math.round(cz + Math.sin(a) * rad);
      if (done.has(lz * 16 + lx)) continue;
      done.add(lz * 16 + lx);
      const y = floorSpot(lx, lz);
      if (y < 0 || api.rand(88, api.x0 + lx, y, api.z0 + lz) < RING_GAP) continue;
      api.set(lx, y, lz, kind);
    }
  }

  // the giant mushrooms: one try in each quarter of the chunk's inner 10 x 10
  for (let q = 0; q < 4; q++) {
    const salt = (k: number) => api.rand(90 + k, api.x0 + q, 0, api.z0);
    if (salt(0) >= GIANT_IN_CELL) continue;
    const lx = CAP_REACH + (q & 1) * 5 + Math.floor(salt(1) * 5), lz = CAP_REACH + (q >> 1) * 5 + Math.floor(salt(2) * 5);
    const large = salt(3) < LARGE, plan = large ? PLANS.large : PLANS.small;
    const colour = salt(4) < RED ? COLOURS[0] : salt(4) < OCHRE ? COLOURS[1] : COLOURS[2];
    const len = large ? 6 + Math.floor(salt(5) * 4) : 4 + Math.floor(salt(5) * 3); // stems of 6..9 / 4..6
    const h = api.heightAt(api.x0 + lx, api.z0 + lz);
    if (!inBiome[lz * 16 + lx] || api.get(lx, h, lz) !== SOIL) continue;
    const top = h + len; // the cap's brim tier is at y `top`; the stem fills h+1 .. top-1, the gills hang at top-1
    // every cell it will take: free (air or a plant), dry, over the biome's columns
    const cells: Array<[number, number, number, string]> = [];
    for (let y = h + 1; y < top; y++) {
      const thick = large ? y < top - 2 : y - h <= Math.ceil(len / 2);
      cells.push([lx, y, lz, thick ? STEM : STEM_THIN]);
    }
    for (const c of plan) {
      cells.push([lx + c.dx, top + c.dy, lz + c.dz, capName(colour, c.part)]);
      if (c.dy === 0 && c.part === 'body' && (c.dx || c.dz)) cells.push([lx + c.dx, top - 1, lz + c.dz, GILLS]);
    }
    let ok = true;
    for (const [x, y, z] of cells) {
      const b = api.get(x, y, z);
      if (b === null || !SOFT.has(b) || !inBiome[z * 16 + x] || wet(x, y, z)) { ok = false; break; }
    }
    if (!ok) continue;
    // shelf fungi on a low part of a thick stem
    if (salt(6) < (large ? SHELF_LARGE : SHELF_SMALL)) { const at = cells.find(([, y, , n]) => n === STEM && y === h + 2); if (at) at[3] = SHELF; }
    for (const [x, y, z, n] of cells) api.set(x, y, z, n);
    // a violet giant gathers small glowing mushrooms at its foot
    if (colour === 'violet' && salt(7) < GLOW_AT_VIOLET) {
      for (const [dx, dz] of [[1, 0], [-1, 1], [0, -1], [-1, -1], [2, 1]]) {
        const y = floorSpot(lx + dx, lz + dz);
        if (y >= 0 && api.rand(97, api.x0 + lx + dx, y, api.z0 + lz + dz) < 0.6) api.set(lx + dx, y, lz + dz, SMALL[2]);
      }
    }
  }
}
