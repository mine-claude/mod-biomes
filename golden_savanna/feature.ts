// @ts-check
// The decoration step of the Savana Dourada. Runs once per chunk whose centre is in the biome (the step's `biomes` filter)
// and then asks the biome of EACH column, so a chunk on the edge only decorates its savanna side. In order (the big pieces
// first, so the grass grows around them):
//   - flat-top trees: a thin trunk that leans, forks in two, and carries a wide flat umbrella of leaves on both branches,
//     now and then a weaver-bird nest hanging under the umbrella;
//   - termite mounds: tapered earthen spires of 3..6 blocks (earth, base, mid, top pieces of decreasing width), sometimes
//     with a shorter side turret, on a patch of termite earth;
//   - lichen boulders: a small rounded cluster of granite;
//   - the tall golden grass (two blocks), dry thorn bushes and a few bleached bones on the free grass.
//
// Chunk-safe by construction: every piece is PLANNED first and placed only when every cell of it lies inside this chunk,
// at least one block from its border (lx/lz 1..14), over columns of the biome. Nothing depends on a neighbour chunk or on
// the order chunks are generated in. Pure: only api.rand (always with WORLD coordinates: without them it is the same number
// in every chunk), api.get / api.set (this chunk), api.heightAt / api.biomeAt (pure functions of the world coordinates).
import { ns } from '../src/names.ts';

const BIOME = ns('golden_savanna');
const TALL = ns('savanna_grass'), TALL_TOP = ns('savanna_grass_top'), LOG = ns('savanna_log'), LEAVES = ns('savanna_leaves');
const EARTH = ns('termite_earth'), BASE = ns('termite_mound_base'), MID = ns('termite_mound_mid'), TOP = ns('termite_mound_top');
const THORN = ns('thorn_bush'), BONES = ns('bleached_bones'), BOULDER = ns('lichen_boulder'), NEST = ns('weaver_nest');
const AIR = 'mineclaude:air', GRASS = 'mineclaude:grass', BASE_TALL_GRASS = 'mineclaude:tall_grass';

export const MARGIN = 1; // every piece keeps this far from the chunk's border (lx/lz MARGIN..15-MARGIN)
/** The pieces of a termite mound, bottom to top: a spire only ever narrows going up (the tests check the order). */
export const MOUND_ORDER = Object.freeze([EARTH, BASE, MID, TOP]);
export const MOUND_MIN = 3, MOUND_MAX = 6;
/** The stack of a mound `tall` blocks high (3..6), bottom first. */
export function moundStack(tall: number): string[] {
  const body = [BASE, MID, ...(tall >= 4 ? [MID] : []), TOP];
  return [...Array(Math.max(0, tall - body.length)).fill(EARTH), ...body];
}

// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const TREE_ODDS = [0.42, 0.18], NEST_ODDS = 0.55, MOUND_ODDS = [0.5, 0.25], TURRET_ODDS = 0.55, BOULDER_ODDS = 0.18;
const TALL_ON_GRASS = 0.1, TALL_FOR_BASE_GRASS = 0.55, THORN_ODDS = 0.012, BONES_ODDS = 0.002;

type Cell = [number, number, number]; // lx, y, lz
type Env = {
  api: any;
  roll: (salt: number, k?: number) => number;
  inBiome: Uint8Array;
  used: Uint8Array; // columns a piece already took (trees' footprints, mounds, boulders)
  ok: (lx: number, lz: number) => boolean; // inside the margin and in the biome
  freeGround: (lx: number, lz: number) => number; // the height of grass with nothing solid over it, else -1
};

/** @param {any} api */
export function decorateGoldenSavanna(api: any) {
  const inBiome = new Uint8Array(256), used = new Uint8Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) inBiome[lz * 16 + lx] = api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME ? 1 : 0;
  const env: Env = {
    api, inBiome, used,
    roll: (salt, k = 0) => api.rand(salt, api.x0 + k, 0, api.z0),
    ok: (lx, lz) => lx >= MARGIN && lx <= 15 - MARGIN && lz >= MARGIN && lz <= 15 - MARGIN && inBiome[lz * 16 + lx] === 1,
    freeGround: (lx, lz) => {
      const h = api.heightAt(api.x0 + lx, api.z0 + lz), above = api.get(lx, h + 1, lz);
      return api.get(lx, h, lz) === GRASS && (above === AIR || above === BASE_TALL_GRASS) ? h : -1;
    },
  };
  for (let i = 0; i < TREE_ODDS.length; i++) placeTree(env, i);
  for (let i = 0; i < MOUND_ODDS.length; i++) placeMound(env, i);
  placeBoulder(env);
  placePlants(env);
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// a flat-top tree: trunk, lean, fork, two branches, an umbrella over both tips
function placeTree({ api, roll, ok, used, freeGround }: Env, i: number) {
  const r = (k: number) => roll(60 + k, i * 17);
  if (r(0) >= TREE_ODDS[i]) return;
  const bx = 4 + Math.floor(r(1) * 8), bz = 4 + Math.floor(r(2) * 8);
  if (!ok(bx, bz) || used[bz * 16 + bx]) return;
  const h = freeGround(bx, bz);
  if (h < 0) return;
  // lean toward the chunk's middle (more room for the crown), on a random axis
  const alongX = r(3) < 0.5;
  const lean: readonly [number, number] = alongX ? [bx < 8 ? 1 : -1, 0] : [0, bz < 8 ? 1 : -1];
  const side: readonly [number, number] = alongX ? [0, (r(4) < 0.5 ? 1 : -1)] : [(r(4) < 0.5 ? 1 : -1), 0];
  const straight = 2 + Math.floor(r(5) * 2), leanLen = 1 + Math.floor(r(6) * 2);
  const lenA = 1 + Math.floor(r(7) * 2), lenB = 1 + Math.floor(r(8) * 2);
  // two tries: the full crown, then a smaller one when the full one would leave the chunk
  for (const shrink of [0, 1]) {
    const logs: Cell[] = [];
    let leaves: Cell[] = [];
    let x = bx, z = bz, y = h;
    for (let k = 0; k < straight; k++) logs.push([x, ++y, z]);
    // the lean: a step aside, a step up (the cells touch face to face, so the trunk reads as one slanted line)
    for (let k = 0; k < leanLen; k++) { x += lean[0]; z += lean[1]; logs.push([x, y, z]); logs.push([x, ++y, z]); }
    // the fork: branch A goes on along the lean, branch B out to the side
    const tips: Cell[] = [];
    for (const [dir, len] of [[lean, lenA], [side, lenB]] as const) {
      let tx = x, ty = y, tz = z;
      for (let k = 0; k < len; k++) {
        tx += dir[0]; tz += dir[1];
        logs.push([tx, ty, tz]); logs.push([tx, ++ty, tz]);
      }
      tips.push([tx, ty, tz]);
    }
    // a flat top: both umbrellas at the same height; the lower tip grows up to it
    const padY = Math.max(tips[0][1], tips[1][1]) + 1;
    for (const t of tips) for (let yy = t[1] + 1; yy < padY; yy++) logs.push([t[0], yy, t[2]]);
    tips.forEach((t, n) => {
      const rad = 2.4 + r(9 + n) * 1.1 - shrink;
      const reach = Math.ceil(rad);
      for (const [dy, rr] of [[0, rad], [1, rad - 1.4]] as const) {
        if (rr < 0.8) continue;
        for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
          const d2 = dx * dx + dz * dz, edge = rr * rr - d2;
          if (edge < 0) continue;
          const cx = t[0] + dx, cz = t[2] + dz;
          if (edge < 2 && api.rand(66, api.x0 + cx, padY + dy, api.z0 + cz) < 0.4) continue; // a ragged rim
          leaves.push([cx, padY + dy, cz]);
        }
      }
    });
    // the ragged rim can drop the one leaf that joined another to the crown: keep only the leaves that touch the wood face to
    // face, directly or through other leaves (no leaf floats alone in the air)
    {
      const key = (x: number, y: number, z: number) => x + ',' + y + ',' + z;
      const byKey = new Map(leaves.map((c) => [key(c[0], c[1], c[2]), c] as const));
      const live = new Set<string>(), queue: Cell[] = [...logs];
      for (let c = queue.pop(); c; c = queue.pop()) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const k = key(c[0] + dx, c[1] + dy, c[2] + dz), l = byKey.get(k);
          if (l && !live.has(k)) { live.add(k); queue.push(l); }
        }
      }
      leaves = leaves.filter((c) => live.has(key(c[0], c[1], c[2])));
    }
    const all = [...logs, ...leaves];
    if (!all.every(([cx, , cz]) => ok(cx, cz))) continue;
    // nothing solid in the way (a trunk of the game, a boulder of another try)
    if (!logs.every(([cx, cy, cz]) => { const b = api.get(cx, cy, cz); return b === AIR || b === BASE_TALL_GRASS || b === LEAVES; })) return;
    for (const [cx, cy, cz] of leaves) api.set(cx, cy, cz, LEAVES, true);
    for (const [cx, cy, cz] of logs) api.set(cx, cy, cz, LOG);
    for (const [cx, , cz] of all) used[cz * 16 + cx] = 1;
    // weaver-bird nests hanging under the umbrella: under a leaf with two free cells below, away from the wood
    if (r(12) < NEST_ODDS) {
      const want = 1 + Math.floor(r(13) * 3);
      let placed = 0;
      for (let k = 0; k < leaves.length && placed < want; k++) {
        const [cx, cy, cz] = leaves[(k * 7 + Math.floor(r(14) * leaves.length)) % leaves.length];
        if (cy !== padY || api.get(cx, cy - 1, cz) !== AIR || api.get(cx, cy - 2, cz) !== AIR) continue;
        if (logs.some(([lx, ly, lz]) => Math.abs(lx - cx) + Math.abs(lz - cz) <= 1 && ly >= cy - 2)) continue;
        if (api.rand(67, api.x0 + cx, cy, api.z0 + cz) < 0.5) continue;
        api.set(cx, cy - 1, cz, NEST, true);
        placed++;
      }
    }
    return;
  }
}

// a termite mound: a tapered spire on a patch of termite earth, sometimes with a shorter turret beside it
function placeMound({ api, roll, ok, used, freeGround }: Env, i: number) {
  const r = (k: number) => roll(80 + k, i * 23);
  if (r(0) >= MOUND_ODDS[i]) return;
  const mx = 2 + Math.floor(r(1) * 12), mz = 2 + Math.floor(r(2) * 12);
  if (!ok(mx, mz) || used[mz * 16 + mx]) return;
  const g = freeGround(mx, mz);
  if (g < 0) return;
  const tall = MOUND_MIN + Math.floor(r(3) * (MOUND_MAX - MOUND_MIN + 1));
  for (let y = g + 1; y <= g + tall + 1; y++) { const b = api.get(mx, y, mz); if (b !== AIR && b !== BASE_TALL_GRASS) return; }
  const stack = moundStack(tall);
  stack.forEach((b, k) => api.set(mx, g + 1 + k, mz, b));
  used[mz * 16 + mx] = 1;
  // the patch of termite earth around its foot (only where the ground is grass at the same height)
  for (const [dx, dz] of [[0, 0], ...DIRS]) {
    const cx = mx + dx, cz = mz + dz;
    if (ok(cx, cz) && api.heightAt(api.x0 + cx, api.z0 + cz) === g && api.get(cx, g, cz) === GRASS) {
      api.set(cx, g, cz, EARTH);
      if (api.get(cx, g + 1, cz) === BASE_TALL_GRASS) api.set(cx, g + 1, cz, AIR);
      used[cz * 16 + cx] = 1;
    }
  }
  // a side turret, at least two shorter: a base and a top (or base, mid, top), standing on the patch
  if (tall >= 4 && r(4) < TURRET_ODDS) {
    const [dx, dz] = DIRS[Math.floor(r(5) * 4)], tx = mx + dx, tz = mz + dz;
    if (ok(tx, tz) && api.get(tx, g, tz) === EARTH && api.get(tx, g + 1, tz) === AIR) {
      const turret = tall >= 5 && r(6) < 0.5 ? [BASE, MID, TOP] : [BASE, TOP];
      if (turret.every((_, k) => api.get(tx, g + 1 + k, tz) === AIR)) turret.forEach((b, k) => api.set(tx, g + 1 + k, tz, b));
    }
  }
}

// a lichen boulder: a rounded cluster, taller in the middle
function placeBoulder({ api, roll, ok, used, freeGround }: Env) {
  if (roll(90) >= BOULDER_ODDS) return;
  const cx = 3 + Math.floor(roll(91) * 10), cz = 3 + Math.floor(roll(92) * 10);
  if (!ok(cx, cz) || used[cz * 16 + cx]) return;
  const g = freeGround(cx, cz);
  if (g < 0) return;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const lx = cx + dx, lz = cz + dz, d = Math.abs(dx) + Math.abs(dz);
    if (!ok(lx, lz) || used[lz * 16 + lx]) continue;
    const h = freeGround(lx, lz);
    if (h < 0 || Math.abs(h - g) > 1) continue;
    const v = api.rand(93, api.x0 + lx, 0, api.z0 + lz);
    const k = d === 0 ? 1 + Math.floor(roll(94) * 2) : d === 1 ? (v < 0.65 ? 1 : 0) : (v < 0.15 ? 1 : 0);
    if (!k) continue;
    if (api.get(lx, h + 1, lz) === BASE_TALL_GRASS) api.set(lx, h + 1, lz, AIR);
    for (let y = h + 1; y <= h + k; y++) api.set(lx, y, lz, BOULDER, true);
    used[lz * 16 + lx] = 1;
  }
}

// the free grass: tall golden grass (in place of much of the game's own short grass), thorn bushes, bleached bones
function placePlants({ api, inBiome, used }: Env) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      if (!inBiome[lz * 16 + lx] || used[lz * 16 + lx]) continue;
      const wx = api.x0 + lx, wz = api.z0 + lz, h = api.heightAt(wx, wz);
      if (api.get(lx, h, lz) !== GRASS) continue;
      const above = api.get(lx, h + 1, lz);
      if (above !== AIR && above !== BASE_TALL_GRASS) continue;
      const r = api.rand(21, wx, h, wz);
      const tall = r < TALL_ON_GRASS || (above === BASE_TALL_GRASS && r < TALL_FOR_BASE_GRASS);
      if (tall && api.get(lx, h + 2, lz) === AIR) { api.set(lx, h + 1, lz, TALL); api.set(lx, h + 2, lz, TALL_TOP); continue; }
      if (above !== AIR) continue;
      if (r < TALL_FOR_BASE_GRASS + THORN_ODDS && r >= TALL_FOR_BASE_GRASS) api.set(lx, h + 1, lz, THORN, true);
      else if (r >= 0.9 && r < 0.9 + BONES_ODDS) api.set(lx, h + 1, lz, BONES, true);
    }
  }
}
