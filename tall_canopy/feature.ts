// @ts-check
// The decoration step of the Bosque de Copas Altas: the shaded floor (shade ferns, undergrowth bushes) and the TALL trees —
// straight trunks of 9 to 14 blocks under broad, flat crowns.
//
// Chunk-safe by construction: a tall tree is drawn ENTIRELY inside the chunk it belongs to. Its trunk stands 4..11 blocks into
// the chunk and its crown reaches at most 4 blocks out, so it never needs a neighbour chunk (the base game's trees draw a
// margin of crowns across borders instead; this step only gets its own chunk: api.set outside it is ignored). Every number
// comes from api.rand with WORLD coordinates and every read is of this chunk or of pure functions (heightAt, biomeAt), so the
// chunk is the same whatever order chunks are generated in, on every side.
import { ns } from '../src/names.ts';

const BIOME = ns('tall_canopy');
const LOG = ns('canopy_log'), LEAVES = ns('canopy_leaves'), FERN = ns('canopy_fern'), BUSH = ns('undergrowth');
const AIR = 'mineclaude:air', GRASS = 'mineclaude:grass', TALL_GRASS = 'mineclaude:tall_grass', BASE_LOG = 'mineclaude:log';
const BASE_LEAVES = 'mineclaude:leaves';

export const TRUNK_MIN = 9, TRUNK_SPAN = 6; // trunks of 9..14
export const CROWN = 4; // the crown's reach from the trunk (so trunks stand CROWN..15-CROWN into the chunk)
// the crown, layer by layer from 3 below the trunk's top to 1 above it: the radius of each layer
const LAYERS: Array<[number, number]> = [[-3, 2.6], [-2, 4], [-1, 4.3], [0, 3.4], [1, 2]];
// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const TREE_IN_CELL = 0.8, FERN_ON_GRASS = 0.15, BUSH_ON_GRASS = 0.07, FERN_FOR_TALL_GRASS = 0.45, MIN_GAP = 3;

/** @param {import('../../../packages/cli/types/mineclaude-mod').WorldgenApi} api */
export function decorateTallCanopy(api: any) {
  const inBiome = new Uint8Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) inBiome[lz * 16 + lx] = api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME ? 1 : 0;

  // the floor: shade ferns and undergrowth on the grass, ferns in place of some tall grass
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      if (!inBiome[lz * 16 + lx]) continue;
      const wx = api.x0 + lx, wz = api.z0 + lz, h = api.heightAt(wx, wz);
      if (api.get(lx, h, lz) !== GRASS) continue;
      const above = api.get(lx, h + 1, lz), r = api.rand(41, wx, h, wz);
      if (above === AIR) { if (r < FERN_ON_GRASS) api.set(lx, h + 1, lz, FERN); else if (r < FERN_ON_GRASS + BUSH_ON_GRASS) api.set(lx, h + 1, lz, BUSH); }
      else if (above === TALL_GRASS && r < FERN_FOR_TALL_GRASS) api.set(lx, h + 1, lz, FERN);
    }
  }

  // the tall trees: one try in each quarter of the chunk's inner 8 x 8
  const trunks: Array<[number, number]> = [];
  for (let q = 0; q < 4; q++) {
    const salt = (k: number) => api.rand(50 + k, api.x0 + q, 0, api.z0);
    if (salt(0) >= TREE_IN_CELL) continue;
    const lx = CROWN + (q & 1) * 4 + Math.floor(salt(1) * 4), lz = CROWN + (q >> 1) * 4 + Math.floor(salt(2) * 4);
    if (trunks.some(([x, z]) => Math.abs(x - lx) < MIN_GAP && Math.abs(z - lz) < MIN_GAP)) continue;
    // the trunk and the crown's four reaches in the biome (a tree at the very edge would be cut by the next biome)
    if (!inBiome[lz * 16 + lx] || !inBiome[lz * 16 + lx + CROWN] || !inBiome[lz * 16 + lx - CROWN] || !inBiome[(lz + CROWN) * 16 + lx] || !inBiome[(lz - CROWN) * 16 + lx]) continue;
    const wx = api.x0 + lx, wz = api.z0 + lz, h = api.heightAt(wx, wz);
    if (api.get(lx, h, lz) !== GRASS) continue;
    const th = TRUNK_MIN + Math.floor(salt(3) * TRUNK_SPAN), top = h + th;
    let clear = true;
    for (let y = h + 1; y <= top + 1 && clear; y++) if (api.get(lx, y, lz) === BASE_LOG || api.get(lx, y, lz) === LOG || api.get(lx, y, lz) === null) clear = false;
    if (!clear) continue;
    trunks.push([lx, lz]);
    // the crown: flat layers, ragged at the rim; only into air and only over the biome's columns
    for (const [dy, rad] of LAYERS) {
      const y = top + dy;
      for (let dz = -CROWN; dz <= CROWN; dz++) {
        for (let dx = -CROWN; dx <= CROWN; dx++) {
          const cx = lx + dx, cz = lz + dz, d2 = dx * dx + dz * dz;
          if (!inBiome[cz * 16 + cx]) continue;
          const edge = rad * rad - d2;
          if (edge < 0 || (edge < 2.2 && api.rand(56, api.x0 + cx, y, api.z0 + cz) < 0.45)) continue;
          api.set(cx, y, cz, LEAVES, true);
        }
      }
    }
    // two short branches under the crown, toward two different sides
    const s0 = Math.floor(salt(4) * 4);
    for (const s of [s0, (s0 + 1 + Math.floor(salt(5) * 3)) % 4]) {
      const bx = s === 0 ? 1 : s === 1 ? -1 : 0, bz = s === 2 ? 1 : s === 3 ? -1 : 0;
      for (let k = 1; k <= 2; k++) {
        const y = top - 2 - (k === 1 ? 1 : 0), cx = lx + bx * k, cz = lz + bz * k, b = api.get(cx, y, cz);
        if (inBiome[cz * 16 + cx] && (b === AIR || b === LEAVES || b === BASE_LEAVES)) api.set(cx, y, cz, LOG);
      }
    }
    // the trunk last: straight up through whatever plant or leaf was in the way
    for (let y = h + 1; y <= top; y++) api.set(lx, y, lz, LOG);
  }
}
