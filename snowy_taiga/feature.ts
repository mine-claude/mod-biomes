// @ts-check
// The decoration step of the Taiga Nevada. The biome's surface is the base game's full Snow block (mineclaude:snow); this
// step draws everything on it:
//   - the floor: thawed patches of frosty grass (biome-tinted) in a slow noise, a thin Snow Layer drifting onto their rims;
//   - tall narrow CONIFERS: a straight Spruce Log trunk of 8..13 under 3 or 4 tiers of Spruce Needles, each tier a disk with a
//     drooping rim one block lower, the tiers NARROWER going up, a spike on top; every needle with open air above it turns
//     into Snowy Needles (snow lies only on the top faces); now and then an Icicle hangs under the lowest tier;
//   - dead snags (a bare stump with one or two stubs, snow on top) and fallen logs (snow along the top);
//   - Frost Berry Bushes and Pinecones on the ground; rarely a Hot Spring Vent on a thawed ring of gravel and grass.
//
// Chunk-safe by construction, like the Bosque de Copas Altas: a conifer is drawn ENTIRELY inside its chunk (trunks stand
// CROWN..15-CROWN into it, the tiers reach at most CROWN), snags, logs and the vent likewise; nothing reads a neighbour chunk
// except through the pure heightAt/biomeAt. Every number comes from api.rand with WORLD coordinates.
// No non-cube block touches water: the thin/small ones (snow layer, bush, pinecone, icicle, vent) only go in columns 1..14 of
// the chunk, where all six neighbours are readable, and only where none of them is water.
import { ns } from '../src/names.ts';

const BIOME = ns('snowy_taiga');
export const LOG = ns('spruce_log'), NEEDLES = ns('spruce_needles'), SNOWY = ns('snowy_needles');
export const LAYER = ns('snow_layer'), BUSH = ns('frost_berry_bush'), ICICLE = ns('icicle'), CONE = ns('pinecone'), VENT = ns('hot_spring_vent');
const AIR = 'mineclaude:air', SNOW = 'mineclaude:snow', GRASS = 'mineclaude:grass', TALL_GRASS = 'mineclaude:tall_grass';
const GRAVEL = 'mineclaude:gravel', STONE = 'mineclaude:stone', BASE_LOG = 'mineclaude:log';
const isWater = (b: string | null) => b !== null && /^mineclaude:water(_\d)?$/.test(b);
const GROUND = new Set([SNOW, GRASS]);

export const CROWN = 3; // the widest tier's reach from the trunk (trunks stand CROWN..15-CROWN into the chunk)
export const TRUNK_MIN = 8, TRUNK_SPAN = 6; // trunks of 8..13
// the radius of each tier, from the lowest up (non-increasing): short trees get 3 tiers, tall ones 4
const TIERS: Record<number, number[]> = { 3: [3, 2, 1], 4: [3, 2, 2, 1] };
// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const THAW = 0.24, DRIFT_ON_RIM = 0.55, TREE_IN_CELL = 0.62, MIN_GAP = 3, RAGGED = 0.3, DROOP = 0.7, ICICLE_UNDER = 0.1;
const BUSH_ON_GROUND = 0.012, CONE_NEAR_TRUNK = 0.07, SNAG = 0.28, FALLEN = 0.3, LAYER_ON_LOG = 0.75, VENT_IN_CHUNK = 0.045;
const PATCH = 7; // the thawed patches: a value noise on a lattice of 7 blocks

/** A smooth value noise (0..1) from api.rand on a lattice of world coordinates: neighbouring chunks agree. */
function patch(api: any, salt: number, wx: number, wz: number) {
  const gx = Math.floor(wx / PATCH), gz = Math.floor(wz / PATCH), fx = (wx - gx * PATCH) / PATCH, fz = (wz - gz * PATCH) / PATCH;
  const at = (i: number, j: number) => api.rand(salt, i, 0, j);
  const a = at(gx, gz), b = at(gx + 1, gz), c = at(gx, gz + 1), d = at(gx + 1, gz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** @param {import('../../../packages/cli/types/mineclaude-mod').WorldgenApi} api */
export function decorateSnowyTaiga(api: any) {
  const inBiome = new Uint8Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) inBiome[lz * 16 + lx] = api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME ? 1 : 0;
  const ours = (lx: number, lz: number) => lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && inBiome[lz * 16 + lx] === 1;
  const inner = (lx: number, lz: number) => lx >= 1 && lx <= 14 && lz >= 1 && lz <= 14;
  const H = new Int16Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) H[lz * 16 + lx] = api.heightAt(api.x0 + lx, api.z0 + lz);
  const hAt = (lx: number, lz: number) => H[lz * 16 + lx];
  /** A cell where a non-cube block may go: inner column of the biome, air (or tall grass) there, no water next to it. */
  const dry = (lx: number, y: number, lz: number) => {
    if (!inner(lx, lz) || !ours(lx, lz)) return false;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (isWater(api.get(lx + dx, y + dy, lz + dz))) return false;
    return true;
  };
  const free = (b: string | null) => b === AIR || b === TALL_GRASS;
  /** A snow layer on top of the solid block at (lx, y - 1, lz), when the cell is free and dry. */
  const layerOn = (lx: number, y: number, lz: number) => { if (free(api.get(lx, y, lz)) && dry(lx, y, lz)) api.set(lx, y, lz, LAYER); };

  // ---- the floor: thawed patches of frosty grass on the snow
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
    if (!ours(lx, lz)) continue;
    const wx = api.x0 + lx, wz = api.z0 + lz, h = hAt(lx, lz);
    if (api.get(lx, h, lz) === SNOW && patch(api, 61, wx, wz) < THAW) api.set(lx, h, lz, GRASS);
  }

  // ---- the conifers: one try in each cell of a 3 x 3 grid over the chunk's inner 10 x 10
  const needles: Array<[number, number, number]> = [];
  const lowest: Array<[number, number, number]> = []; // the lowest tier's droop: where icicles may hang
  const trunks: Array<[number, number, number]> = [];
  for (let q = 0; q < 9; q++) {
    const salt = (k: number) => api.rand(70 + k, api.x0 + q, 0, api.z0);
    if (salt(0) >= TREE_IN_CELL) continue;
    const lx = CROWN + (q % 3) * 3 + Math.floor(salt(1) * 3), lz = CROWN + Math.floor(q / 3) * 3 + Math.floor(salt(2) * 3);
    if (trunks.some(([x, , z]) => Math.abs(x - lx) < MIN_GAP && Math.abs(z - lz) < MIN_GAP)) continue;
    if (!ours(lx, lz) || !ours(lx + CROWN, lz) || !ours(lx - CROWN, lz) || !ours(lx, lz + CROWN) || !ours(lx, lz - CROWN)) continue;
    const h = hAt(lx, lz);
    if (!GROUND.has(api.get(lx, h, lz))) continue;
    const th = TRUNK_MIN + Math.floor(salt(3) * TRUNK_SPAN), top = h + th;
    let clear = true;
    for (let y = h + 1; y <= top + 2 && clear; y++) { const b = api.get(lx, y, lz); if (b === null || b === BASE_LOG || b === LOG || isWater(b)) clear = false; }
    if (!clear) continue;
    trunks.push([lx, lz, h]);
    for (let y = h + 1; y <= top; y++) api.set(lx, y, lz, LOG); // the trunk first: straight up through any plant
    const radii = TIERS[th >= 11 ? 4 : 3], n = radii.length;
    const put = (x: number, y: number, z: number) => { if (ours(x, z) && api.set(x, y, z, NEEDLES, true)) { needles.push([x, y, z]); return true; } return false; };
    for (let k = 0; k < n; k++) {
      const r = radii[k], y = top - 2 * (n - 1 - k), r2 = r * r + 0.5;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dz * dz, axis = dx === 0 || dz === 0;
        if (d2 > r2) continue;
        // the disk: ragged off the axes (the four tips always stay, so the tier keeps its width)
        if (axis || d2 <= (r - 1) * (r - 1) || api.rand(76, api.x0 + lx + dx, y, api.z0 + lz + dz) >= RAGGED) put(lx + dx, y, lz + dz);
        // the droop: the rim hangs one block lower (not on the 1-wide top tier)
        if (r >= 2 && d2 > (r - 1) * (r - 1) + 0.5 && (axis || api.rand(77, api.x0 + lx + dx, y, api.z0 + lz + dz) < DROOP)) {
          if (put(lx + dx, y - 1, lz + dz) && k === 0) lowest.push([lx + dx, y - 1, lz + dz]);
        }
      }
    }
    put(lx, top + 1, lz); // the spike
    if (th >= 10) put(lx, top + 2, lz);
    // pinecones on the ground round the trunk
    for (let dz = -CROWN; dz <= CROWN; dz++) for (let dx = -CROWN; dx <= CROWN; dx++) {
      const x = lx + dx, z = lz + dz;
      if ((dx === 0 && dz === 0) || !ours(x, z) || api.rand(78, api.x0 + x, 0, api.z0 + z) >= CONE_NEAR_TRUNK) continue;
      const g = hAt(x, z);
      if (GROUND.has(api.get(x, g, z)) && api.get(x, g + 1, z) === AIR && dry(x, g + 1, z)) api.set(x, g + 1, z, CONE);
    }
  }

  // ---- a dead snag: a bare stump of 3..6 with one or two stubs, snow on top of each, an icicle under a stub
  if (api.rand(80, api.x0, 0, api.z0) < SNAG) {
    const lx = 2 + Math.floor(api.rand(81, api.x0, 0, api.z0) * 12), lz = 2 + Math.floor(api.rand(82, api.x0, 0, api.z0) * 12), h = hAt(lx, lz);
    let ok = ours(lx, lz) && GROUND.has(api.get(lx, h, lz));
    const sh = 3 + Math.floor(api.rand(83, api.x0, 0, api.z0) * 4);
    for (let y = h + 1; y <= h + sh + 1 && ok; y++) if (!free(api.get(lx, y, lz))) ok = false;
    if (ok) {
      for (let y = h + 1; y <= h + sh; y++) api.set(lx, y, lz, LOG);
      layerOn(lx, h + sh + 1, lz);
      const stubs = 1 + Math.floor(api.rand(84, api.x0, 0, api.z0) * 2);
      for (let s = 0; s < stubs; s++) {
        const dir = Math.floor(api.rand(85 + s, api.x0, 0, api.z0) * 4), y = h + sh - 1 - s;
        const x = lx + (dir === 0 ? 1 : dir === 1 ? -1 : 0), z = lz + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
        if (y <= h + 1 || !ours(x, z) || api.get(x, y, z) !== AIR) continue;
        api.set(x, y, z, LOG);
        layerOn(x, y + 1, z);
        if (api.get(x, y - 1, z) === AIR && api.get(x, y - 2, z) === AIR && dry(x, y - 1, z) && api.rand(87 + s, api.x0, 0, api.z0) < 0.5) api.set(x, y - 1, z, ICICLE);
      }
    }
  }

  // ---- a fallen log: 3..5 long along x or z on level ground, snow along its top
  if (api.rand(90, api.x0, 0, api.z0) < FALLEN) {
    const alongX = api.rand(91, api.x0, 0, api.z0) < 0.5, len = 3 + Math.floor(api.rand(92, api.x0, 0, api.z0) * 3);
    const lx = 2 + Math.floor(api.rand(93, api.x0, 0, api.z0) * (alongX ? 12 - len : 12)), lz = 2 + Math.floor(api.rand(94, api.x0, 0, api.z0) * (alongX ? 12 : 12 - len));
    const cells: Array<[number, number]> = [];
    for (let k = 0; k < len; k++) cells.push(alongX ? [lx + k, lz] : [lx, lz + k]);
    const h = hAt(lx, lz);
    if (cells.every(([x, z]) => ours(x, z) && hAt(x, z) === h && GROUND.has(api.get(x, h, z)) && free(api.get(x, h + 1, z)) && api.get(x, h + 2, z) === AIR)) {
      for (const [x, z] of cells) api.set(x, h + 1, z, LOG);
      for (const [x, z] of cells) if (api.rand(95, api.x0 + x, h, api.z0 + z) < LAYER_ON_LOG) layerOn(x, h + 2, z);
    }
  }

  // ---- berry bushes on the open ground
  for (let lz = 1; lz <= 14; lz++) for (let lx = 1; lx <= 14; lx++) {
    if (!ours(lx, lz)) continue;
    const h = hAt(lx, lz);
    if (!GROUND.has(api.get(lx, h, lz)) || !free(api.get(lx, h + 1, lz))) continue;
    if (api.rand(96, api.x0 + lx, h, api.z0 + lz) < BUSH_ON_GROUND && dry(lx, h + 1, lz)) api.set(lx, h + 1, lz, BUSH);
  }

  // ---- rarely, a hot spring vent: a low stone basin on the ground, the snow round it melted to gravel and grass, a few stones
  if (api.rand(100, api.x0, 0, api.z0) < VENT_IN_CHUNK) {
    const lx = 4 + Math.floor(api.rand(101, api.x0, 0, api.z0) * 8), lz = 4 + Math.floor(api.rand(102, api.x0, 0, api.z0) * 8), h = hAt(lx, lz);
    let ok = GROUND.has(api.get(lx, h, lz)) && free(api.get(lx, h + 1, lz));
    for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3 && ok; dx++) if (!ours(lx + dx, lz + dz) || Math.abs(hAt(lx + dx, lz + dz) - h) > 1) ok = false;
    if (ok && api.get(lx, h + 2, lz) === AIR && dry(lx, h + 1, lz)) {
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const x = lx + dx, z = lz + dz, g = hAt(x, z), d2 = dx * dx + dz * dz;
        if (d2 > 10 || !GROUND.has(api.get(x, g, z))) continue;
        api.set(x, g, z, d2 <= 2 ? GRAVEL : api.rand(103, api.x0 + x, g, api.z0 + z) < 0.2 ? STONE : GRASS);
        const above = api.get(x, g + 1, z);
        if (above === LAYER || above === CONE || above === BUSH || above === TALL_GRASS) api.set(x, g + 1, z, AIR);
      }
      api.set(lx, h + 1, lz, VENT); // on the gravel, its basin rim half a block high
    }
  }

  // ---- drifts: a snow layer on the grass at the rim of a thawed patch (a snow column next to it)
  for (let lz = 1; lz <= 14; lz++) for (let lx = 1; lx <= 14; lx++) {
    if (!ours(lx, lz)) continue;
    const h = hAt(lx, lz);
    if (api.get(lx, h, lz) !== GRASS || api.get(lx, h + 1, lz) !== AIR) continue;
    let rim = false;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (api.get(lx + dx, hAt(lx + dx, lz + dz), lz + dz) === SNOW) rim = true;
    if (rim && api.rand(104, api.x0 + lx, h, api.z0 + lz) < DRIFT_ON_RIM) layerOn(lx, h + 1, lz);
  }

  // ---- snow on the conifers: every needle with open air above turns snowy (only the top faces carry snow)
  for (const [x, y, z] of needles) {
    const b = api.get(x, y, z), above = api.get(x, y + 1, z);
    if (b === NEEDLES && (above === AIR || above === null)) api.set(x, y, z, SNOWY);
  }
  // ---- icicles under the lowest tier's droop
  for (const [x, y, z] of lowest) {
    if (api.get(x, y - 1, z) !== AIR || api.get(x, y - 2, z) !== AIR || !dry(x, y - 1, z)) continue;
    if (api.rand(105, api.x0 + x, y, api.z0 + z) < ICICLE_UNDER) api.set(x, y - 1, z, ICICLE);
  }
}
