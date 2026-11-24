// @ts-check
// The decoration step of the Ipezal: flowering ipê trees — a dark trunk that twists once (a diagonal kink) and two dark limbs
// into a round crown made ENTIRELY of blossoms of one colour (grove.ts picks it from the crown's world position) —, the
// carpet of fallen petals of the same colour under each crown (the signature look), bromeliads on the open ground, now and
// then a low stump, and in most crowns a hidden blooming core whose petals drift down in the browser (renderer.ts).
//
// Chunk-safe by construction: a tree is drawn ENTIRELY inside the chunk it belongs to. The crown's centre stands 4..11 blocks
// into the chunk, the crown reaches 3 blocks from it and the trunk's foot at most 1, so nothing needs a neighbour chunk
// (api.set outside the chunk is ignored anyway). Every number comes from api.rand with WORLD coordinates or from the pure
// grove colour, and every read is of this chunk or of pure functions (heightAt, biomeAt), so the chunk is the same in any
// order of generation, on every side.
//
// No non-cube block touches water: petal carpets, bromeliads and stumps stand only on grass or dirt, 1..14 into the chunk
// (so all four neighbours are readable), with no water beside them or above them.
import { ns } from '../src/names.ts';
import { blossomColour, trunkHeight, COLOUR_NAMES } from './grove.ts';

const BIOME = ns('ipe_forest');
const LOG = ns('ipe_log'), CORE = ns('blooming_ipe_core'), BROMELIAD = ns('bromeliad'), STUMP = ns('ipe_stump');
const BLOSSOM = COLOUR_NAMES.map((c) => ns(`ipe_blossom_${c}`));
const CARPET = COLOUR_NAMES.map((c) => ns(`petal_carpet_${c}`));
const AIR = 'mineclaude:air', GRASS = 'mineclaude:grass', DIRT = 'mineclaude:dirt', TALL_GRASS = 'mineclaude:tall_grass';
const WATER = 'mineclaude:water', BASE_LOG = 'mineclaude:log';

// trunks of 5..7 (grove.ts trunkHeight: counted at the crown's centre column, from the foot's ground)
export const CROWN = 4; // the crown's centre stands CROWN..15-CROWN into the chunk
export const REACH = 3; // how far the blossoms reach from the crown's centre
// the blooming core takes the crown's heart, right over the trunk's top: the petal renderer starts its petals under the
// crown's lowest layer and lets them fall to the ground (trunkHeight below it)
// the crown, layer by layer from 1 below the trunk's top to 3 above it: the radius of each layer (a round, full dome)
const LAYERS: Array<[number, number]> = [[-1, 2.4], [0, 3.5], [1, 3.8], [2, 3.0], [3, 1.6]];
// odds (the api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const TREE_IN_CELL = 0.75, MIN_GAP = 4, CORE_IN_TREE = 0.6, CARPET_INNER = 0.88, CARPET_RIM = 0.55, BROMELIAD_ON_GRASS = 0.03, STUMP_IN_CHUNK = 0.45;

/** @param {import('../../../packages/cli/types/mineclaude-mod').WorldgenApi} api */
export function decorateIpeForest(api: any) {
  const inBiome = new Uint8Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) inBiome[lz * 16 + lx] = api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME ? 1 : 0;
  // which tree first put a blossom over each column (its index + 1): the carpet under it takes that tree's colour
  const owner = new Uint8Array(256);
  const trees: Array<{ cx: number, cz: number, colour: number }> = [];

  // ---- the trees: one try in each quarter of the chunk, the crown centre at 4..6 or 9..11 (so two trees of a chunk rarely crowd)
  for (let q = 0; q < 4; q++) {
    const salt = (k: number) => api.rand(70 + k, api.x0 + q, 0, api.z0);
    if (salt(0) >= TREE_IN_CELL) continue;
    const cx = CROWN + (q & 1) * 5 + Math.floor(salt(1) * 3), cz = CROWN + (q >> 1) * 5 + Math.floor(salt(2) * 3);
    if (trees.some((t) => Math.abs(t.cx - cx) < MIN_GAP && Math.abs(t.cz - cz) < MIN_GAP)) continue;
    // the crown's centre and its four reaches in the biome (a crown at the very edge would be cut by the next biome)
    if (!inBiome[cz * 16 + cx] || !inBiome[cz * 16 + cx + REACH] || !inBiome[cz * 16 + cx - REACH] || !inBiome[(cz + REACH) * 16 + cx] || !inBiome[(cz - REACH) * 16 + cx]) continue;
    // the foot: one step off the centre (the twist), straight, diagonal or none
    const ox = Math.floor(salt(3) * 3) - 1, oz = Math.floor(salt(4) * 3) - 1;
    const bx = cx - ox, bz = cz - oz;
    if (!inBiome[bz * 16 + bx]) continue;
    const h = api.heightAt(api.x0 + bx, api.z0 + bz);
    if (Math.abs(api.heightAt(api.x0 + cx, api.z0 + cz) - h) > 1) continue; // no twist up a ledge
    const ground = api.get(bx, h, bz);
    if (ground !== GRASS && ground !== DIRT) continue;
    const th = trunkHeight(api.x0 + cx, api.z0 + cz), top = h + th, kink = h + 2 + Math.floor(salt(6) * 2);
    // the trunk's cells: the foot up to the kink, a joint when the step is diagonal, the centre from the kink to the top
    const cells: Array<[number, number, number]> = [];
    for (let y = h + 1; y <= kink; y++) cells.push([bx, y, bz]);
    if (ox !== 0 && oz !== 0) cells.push([bx + ox, kink, bz]);
    for (let y = kink; y <= top; y++) cells.push([cx, y, cz]);
    let clear = true;
    for (const [x, y, z] of cells) { const b = api.get(x, y, z); if (b === null || b === BASE_LOG || b === LOG || b === WATER || (y > h + 1 && b !== AIR && b !== TALL_GRASS && !/leaves$/.test(b))) { clear = false; break; } }
    if (!clear) continue;
    const colour = blossomColour(api.x0 + cx, api.z0 + cz), blossom = BLOSSOM[colour];
    trees.push({ cx, cz, colour });
    const id = trees.length;
    // the crown: a full dome, ragged at the rim; only into air and only over the biome's columns
    for (const [dy, rad] of LAYERS) {
      const y = top + dy;
      for (let dz = -REACH; dz <= REACH; dz++) {
        for (let dx = -REACH; dx <= REACH; dx++) {
          const x = cx + dx, z = cz + dz, d2 = dx * dx + dz * dz;
          if (!inBiome[z * 16 + x]) continue;
          const edge = rad * rad - d2;
          if (edge < 0 || (edge < 2.2 && api.rand(76, api.x0 + x, y, api.z0 + z) < 0.4)) continue;
          if (api.set(x, y, z, blossom, true) && !owner[z * 16 + x]) owner[z * 16 + x] = id;
        }
      }
    }
    // the crown's heart, right over the trunk, is always this tree's colour (a crown drawn before may overlap the rim)
    api.set(cx, top + 1, cz, blossom);
    owner[cz * 16 + cx] = id; // (the carpet under it follows the heart)
    // two dark limbs climbing out into the crown, toward two different diagonals
    const s0 = Math.floor(salt(7) * 4);
    for (const s of [s0, (s0 + 1 + Math.floor(salt(8) * 3)) % 4]) {
      const sx = s & 1 ? 1 : -1, sz = s & 2 ? 1 : -1;
      for (let k = 1; k <= 2; k++) {
        const x = cx + sx * k, z = cz + sz * k, y = top - 1 + k, b = api.get(x, y, z);
        if (inBiome[z * 16 + x] && (b === AIR || b === blossom)) api.set(x, y, z, LOG);
      }
    }
    // the trunk last, through whatever plant or leaf was in the way
    for (const [x, y, z] of cells) api.set(x, y, z, LOG);
    // the blooming core, hidden inside most crowns (its petals drift down in the browser)
    if (salt(9) < CORE_IN_TREE) api.set(cx, top + 1, cz, CORE);
  }

  // ---- the ground: petal carpets under the crowns, bromeliads in the open, now and then a stump
  const dry = (lx: number, y: number, lz: number) => api.get(lx + 1, y, lz) !== WATER && api.get(lx - 1, y, lz) !== WATER
    && api.get(lx, y, lz + 1) !== WATER && api.get(lx, y, lz - 1) !== WATER && api.get(lx, y + 1, lz) !== WATER;
  const spot = (lx: number, lz: number) => { // the free cell over grass/dirt of a column, or -1
    const g = api.heightAt(api.x0 + lx, api.z0 + lz), below = api.get(lx, g, lz), at = api.get(lx, g + 1, lz);
    if ((below !== GRASS && below !== DIRT) || (at !== AIR && at !== TALL_GRASS)) return -1;
    return dry(lx, g + 1, lz) ? g + 1 : -1;
  };
  for (let lz = 1; lz < 15; lz++) {
    for (let lx = 1; lx < 15; lx++) {
      const i = lz * 16 + lx;
      if (!inBiome[i]) continue;
      const wx = api.x0 + lx, wz = api.z0 + lz;
      if (owner[i]) {
        const t = trees[owner[i] - 1], d2 = (lx - t.cx) ** 2 + (lz - t.cz) ** 2;
        if (api.rand(81, wx, 0, wz) >= (d2 <= 5 ? CARPET_INNER : CARPET_RIM)) continue;
        const y = spot(lx, lz);
        if (y >= 0) api.set(lx, y, lz, CARPET[t.colour]);
      } else if (api.rand(82, wx, 0, wz) < BROMELIAD_ON_GRASS) {
        const y = spot(lx, lz);
        if (y >= 0) api.set(lx, y, lz, BROMELIAD);
      }
    }
  }
  if (api.rand(83, api.x0, 0, api.z0) < STUMP_IN_CHUNK) {
    const lx = 2 + Math.floor(api.rand(84, api.x0, 0, api.z0) * 12), lz = 2 + Math.floor(api.rand(85, api.x0, 0, api.z0) * 12);
    if (inBiome[lz * 16 + lx] && !owner[lz * 16 + lx]) { const y = spot(lx, lz); if (y >= 0) api.set(lx, y, lz, STUMP); }
  }
}
