// @ts-check
// The shape and the build of one crystal geode: a hollow chamber deep in the stone, three shells from the outside in —
// smooth basalt, calcite, amethyst — and crystals growing inside it.
//
// It is a big declarative STRUCTURE (ctx.worldgen.structure, size 25): the engine anchors at most one per region of 4 x 4
// chunks and calls build() in EVERY chunk the 25 x 25 footprint touches, with the same origin and an api clipped to that chunk.
// So the geode is written whole without looking at which chunk is running, and its pieces stitch into the same chamber in any
// generation order. Everything here is a pure function of the origin (world coordinates) and of api.rand(salt, x, y, z) with
// WORLD coordinates; get() is only asked about the cell being written or cells of the SAME column (the floor under a
// crystal, the roof over a hanging one), which are always in the running chunk.
//
// Shells: the distance d = |(dx*sx, dy*sy, dz*sz)| with the squash factors s <= 1 is 1-Lipschitz, so two face-neighbouring
// cells differ by at most 1 in d; with each band at least 1 wide (interior d <= ri, amethyst <= ri+1, calcite <= ri+2,
// basalt <= ri+2+bt) the interior air only ever touches amethyst, amethyst never touches basalt or the stone around, and
// calcite never touches the stone: the shells are closed, cell by cell, in every direction.
//
// What it replaces: only the natural ground (stone, dirt, gravel, clay and any `*_ore`). A cave of the base game that passes
// through stays open (its air is never filled: that is how a geode becomes reachable), and anything else (water, lava,
// bedrock, a dungeon's cobblestone) is left alone. The engine already keeps big mod structures out of every chunk with a
// dungeon, ruin, camp, lake, well or river of the game.
import { ns } from '../src/names.ts';

export const SIZE = 25; // the structure's footprint (blocks); the geode's centre is its middle
export const HALF = 12;
export const BLOCKS = Object.freeze({
  basalt: ns('geode_basalt'), calcite: ns('calcite'), amethyst: ns('amethyst_block'), lit: ns('lit_amethyst'),
  cluster: ns('crystal_cluster'), hanging: ns('crystal_cluster_hanging'), great: ns('great_crystal'),
});
const AIR = 'mineclaude:air';
const FLUIDS = new Set(['mineclaude:water', 'mineclaude:lava']);
const NATURAL = new Set(['mineclaude:stone', 'mineclaude:dirt', 'mineclaude:gravel', 'mineclaude:clay']);
const AMETHYST = new Set([BLOCKS.amethyst, BLOCKS.lit]);
export const isNatural = (name: string | null) => !!name && (NATURAL.has(name) || /_ore$/.test(name));

// odds (the api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
export const LIT_SHARE = 0.16; // of the amethyst shell glows (Ametista Luminosa, a light source)
export const FLOOR_CLUSTER = 0.26, CEILING_CLUSTER = 0.16; // crystal clusters on the amethyst floor / under its roof
export const GREAT_CHANCE = 0.75, GREAT_MAX = 2; // great crystals (the showpiece) standing on the floor
export const MIN_Y = 4, MAX_TOP = 52; // never into the bedrock floor; the roof stays this low at most
export const COVER = 5; // at least this much ground between the roof of the geode and the surface over it

export type Geode = { x: number, y: number, z: number, ri: number, bt: number, sx: number, sy: number, sz: number, ext: number, extY: number };

/**
 * The geode of a structure origin, or null when it does not fit (too shallow: an ocean floor, a valley). Pure: world
 * coordinates, api.rand with the origin, api.heightAt.
 * @param {any} api the structure api (origin = the footprint's north-west corner)
 */
export function geodePlan(api: any): Geode | null {
  const o = api.origin;
  const r = (salt: number) => api.rand(salt, o.x, 0, o.z);
  const x = o.x + HALF, z = o.z + HALF;
  const sx = 0.86 + r(101) * 0.14, sz = 0.86 + r(102) * 0.14, sy = 0.8 + r(103) * 0.2;
  const bt = r(104) < 0.5 ? 1 : 2;
  // the outer band must fit the footprint: (ri + 2 + bt) / s <= HALF - 0.5 along x and z
  const maxRi = (HALF - 0.5) * Math.min(sx, sz) - 2 - bt;
  const ri = Math.min(maxRi, 3.6 + r(105) * 2.6);
  const out = ri + 2 + bt;
  const ext = Math.ceil(out / Math.min(sx, sz)), extY = Math.ceil(out / sy);
  // depth: under the lowest of five columns of the footprint, with COVER blocks of ground over the roof
  let minH = Infinity;
  for (const [dx, dz] of [[0, 0], [-ext, -ext], [ext, -ext], [-ext, ext], [ext, ext]]) minH = Math.min(minH, api.heightAt(x + dx, z + dz));
  const lo = MIN_Y + extY, hi = Math.min(minH - COVER - extY, MAX_TOP - extY);
  if (hi < lo) return null;
  const y = lo + Math.floor(r(106) * (hi - lo + 1));
  return { x, y, z, ri, bt, sx, sy, sz, ext, extY };
}

/** 0 outside, 1 basalt, 2 calcite, 3 amethyst, 4 the hollow inside. */
export function layerAt(g: Geode, wx: number, wy: number, wz: number): number {
  const dx = (wx - g.x) * g.sx, dy = (wy - g.y) * g.sy, dz = (wz - g.z) * g.sz;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d <= g.ri) return 4;
  if (d <= g.ri + 1) return 3;
  if (d <= g.ri + 2) return 2;
  if (d <= g.ri + 2 + g.bt) return 1;
  return 0;
}

/** The lowest hollow cell of a column of the geode (its floor is the cell under it), or null. */
export function floorOf(g: Geode, wx: number, wz: number): number | null {
  for (let wy = g.y - g.extY; wy <= g.y; wy++) if (layerAt(g, wx, wy, wz) === 4) return wy;
  return null;
}

/** The great crystals of a geode: up to GREAT_MAX columns near the middle of its floor. Pure (origin and rand). */
export function greatSpots(api: any, g: Geode): Array<{ x: number, z: number }> {
  const o = api.origin;
  const out: Array<{ x: number, z: number }> = [];
  for (let k = 0; k < GREAT_MAX; k++) {
    if (api.rand(120 + k, o.x, 0, o.z) >= (k === 0 ? GREAT_CHANCE : GREAT_CHANCE * 0.5)) continue;
    const a = api.rand(122 + k, o.x, 0, o.z) * Math.PI * 2, d = api.rand(124 + k, o.x, 0, o.z) * g.ri * 0.45;
    out.push({ x: g.x + Math.round(Math.cos(a) * d / g.sx), z: g.z + Math.round(Math.sin(a) * d / g.sz) });
  }
  return out;
}

/**
 * build(api) of the structure: writes the part of the geode inside the running chunk.
 * @param {any} api the structure api
 */
export function buildGeode(api: any) {
  // only in worlds WITH biomes: in a world without them biomeAt is always null and nothing is written (the fixture of the
  // base game stays byte-identical with this mod loaded)
  const o = api.origin;
  if (api.biomeAt(o.x + HALF, o.z + HALF) === null) return;
  const g = geodePlan(api);
  if (!g) return;
  const x0 = api.x0, z0 = api.z0;
  const lx0 = Math.max(0, g.x - g.ext - x0), lx1 = Math.min(15, g.x + g.ext - x0);
  const lz0 = Math.max(0, g.z - g.ext - z0), lz1 = Math.min(15, g.z + g.ext - z0);
  if (lx0 > lx1 || lz0 > lz1) return;
  const y0 = g.y - g.extY, y1 = g.y + g.extY;
  // In a generator with an underground (terrain 2: aquifers, flooded caves) a geode may meet water or lava: the shells take
  // the fluid's place too, and the hollow is drained, so no fluid ever touches the air inside (the shells are closed: see
  // above). Terrain 1 keeps the old rule (fluids stay), byte for byte.
  const fluidAware = api.undergroundAt?.(g.x, g.y, g.z) != null;
  // 1) the shells and the hollow
  for (let lz = lz0; lz <= lz1; lz++) for (let lx = lx0; lx <= lx1; lx++) {
    const wx = x0 + lx, wz = z0 + lz;
    for (let wy = y0; wy <= y1; wy++) {
      const L = layerAt(g, wx, wy, wz);
      if (!L) continue;
      const cur = api.get(lx, wy, lz);
      if (!isNatural(cur) && !(fluidAware && FLUIDS.has(cur))) continue; // cave air stays open; bedrock and built things stay as they are
      if (L === 4) api.set(lx, wy, lz, AIR);
      else if (L === 3) api.set(lx, wy, lz, api.rand(1, wx, wy, wz) < LIT_SHARE ? BLOCKS.lit : BLOCKS.amethyst);
      else api.set(lx, wy, lz, L === 2 ? BLOCKS.calcite : BLOCKS.basalt);
    }
  }
  // 2) the great crystals: on the amethyst floor, with two hollow cells above them (the renderer draws them tall)
  const greats = new Set<string>();
  for (const s of greatSpots(api, g)) {
    const lx = s.x - x0, lz = s.z - z0;
    if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
    const fy = floorOf(g, s.x, s.z);
    if (fy === null || layerAt(g, s.x, fy + 1, s.z) !== 4 || layerAt(g, s.x, fy + 2, s.z) !== 4) continue;
    if (api.get(lx, fy, lz) !== AIR || !AMETHYST.has(api.get(lx, fy - 1, lz))) continue;
    api.set(lx, fy, lz, BLOCKS.great);
    greats.add(`${lx},${lz}`);
  }
  // 3) clusters: on the amethyst floor and hanging from the amethyst roof (same column: always this chunk)
  for (let lz = lz0; lz <= lz1; lz++) for (let lx = lx0; lx <= lx1; lx++) {
    const wx = x0 + lx, wz = z0 + lz;
    if (greats.has(`${lx},${lz}`)) continue;
    for (let wy = y0 + 1; wy < y1; wy++) {
      if (layerAt(g, wx, wy, wz) !== 4 || api.get(lx, wy, lz) !== AIR) continue;
      if (AMETHYST.has(api.get(lx, wy - 1, lz))) { if (api.rand(2, wx, wy, wz) < FLOOR_CLUSTER) api.set(lx, wy, lz, BLOCKS.cluster); }
      else if (AMETHYST.has(api.get(lx, wy + 1, lz)) && api.rand(3, wx, wy, wz) < CEILING_CLUSTER) api.set(lx, wy, lz, BLOCKS.hanging);
    }
  }
}
