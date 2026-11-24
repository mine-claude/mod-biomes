// @ts-check
// The decoration step of the Planalto das Ruínas. Runs once per chunk whose centre is in the biome (the step's `biomes` filter)
// and then asks the biome of EACH column, so a chunk on the edge only decorates its plateau side.
// Pure: only api.rand / api.get / api.set / api.heightAt / api.biomeAt. Every number comes from api.rand with WORLD coordinates
// (without them api.rand gives the same number in every chunk); everything it writes stays inside this chunk (a ruin is placed
// WHOLE inside it or not at all), and it reads only this chunk and pure functions (heightAt, biomeAt), so the result does not
// depend on the order chunks are generated in. In order:
//   - the ground: the bare mountain stone the base game puts on high ground turns to moss; cliff faces (a column standing 2+
//     over a neighbour) turn to weathered stone, the rims go bare now and then;
//     the moss cushion opens into patches of grass (a 4-block world grid, so a patch runs across chunk borders) and of bare rock;
//   - at most one RUIN per chunk: a fallen pillar (a broken stump, its drums lying in a row, the capital at the far end), a
//     broken colonnade (two pillars, the lintel over them, sometimes fallen), a broken statue on its plinth between two rune
//     stones, a toppled obelisk (its stub and the shaft lying in the moss, a carved rune in it) or a ring of rune stones;
//   - loose pieces: a lone rune stone, a drum standing or lying; tall grass on the grass.
import { ns } from '../src/names.ts';

const BIOME = ns('ruin_plateau');
const STONE = ns('weathered_stone'), MOSS = ns('stone_moss'), DRUM = ns('column_drum'), DRUM_X = ns('fallen_drum_x'), DRUM_Z = ns('fallen_drum_z');
const CAPITAL = ns('column_capital'), RUNE = ns('rune_stone'), STATUE = ns('ancient_statue');
const AIR = 'mineclaude:air', GRASS = 'mineclaude:grass', TALL_GRASS = 'mineclaude:tall_grass', BARE = 'mineclaude:stone';
/** What a ruin can stand on (and what the cliff faces are painted over). */
const GROUND = new Set([MOSS, STONE, GRASS, 'mineclaude:stone', 'mineclaude:dirt', 'mineclaude:gravel']);
const FACE = new Set([MOSS, GRASS, 'mineclaude:stone', 'mineclaude:dirt', 'mineclaude:gravel']);

// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
export const RUIN_ODDS = 0.6, RUIN_TRIES = 3;
const GRASS_CELL = 0.3, GRASS_IN_CELL = 0.75, BARE_CELL = 0.9, BARE_IN_CELL = 0.6, BARE_RIM = 0.45;
const LONE_RUNE = 0.0012, LONE_DRUM = 0.0016, LONE_FALLEN = 0.0016, TALL_GRASS_ODDS = 0.3;

type Cell = [number, number];
type Env = {
  api: any;
  roll: (salt: number) => number;
  inB: (lx: number, lz: number) => boolean;
  ground: (lx: number, lz: number) => number;
  free: (lx: number, lz: number) => number;
};

/** @param {any} api */
export function decorateRuinPlateau(api: any) {
  const inBiome = new Uint8Array(256);
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) inBiome[lz * 16 + lx] = api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME ? 1 : 0;
  const inChunk = (lx: number, lz: number) => lx >= 0 && lx < 16 && lz >= 0 && lz < 16;
  const env: Env = {
    api,
    roll: (salt) => api.rand(salt, api.x0, 0, api.z0),
    inB: (lx, lz) => inChunk(lx, lz) && inBiome[lz * 16 + lx] === 1,
    ground: (lx, lz) => api.heightAt(api.x0 + lx, api.z0 + lz),
    // the ground height of a column of the biome whose top is ground with air over it, else -1
    free: (lx, lz) => {
      if (!inChunk(lx, lz) || !inBiome[lz * 16 + lx]) return -1;
      const h = api.heightAt(api.x0 + lx, api.z0 + lz);
      return GROUND.has(api.get(lx, h, lz)) && api.get(lx, h + 1, lz) === AIR && api.get(lx, h + 2, lz) === AIR ? h : -1;
    },
  };
  paintGround(env);
  placeRuin(env);
  placeLoose(env);
}

// the cliffs and the patches of the ground
function paintGround({ api, inB }: Env) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      if (!inB(lx, lz)) continue;
      const wx = api.x0 + lx, wz = api.z0 + lz, h = api.heightAt(wx, wz);
      // the base game turns high mountain ground into bare stone (its rule, before any biome): on the plateau it is moss too
      if (api.get(lx, h, lz) === BARE && api.get(lx, h + 1, lz) === AIR) api.set(lx, h, lz, MOSS);
      const low = Math.min(api.heightAt(wx + 1, wz), api.heightAt(wx - 1, wz), api.heightAt(wx, wz + 1), api.heightAt(wx, wz - 1));
      const drop = h - low;
      if (drop >= 2) {
        // the face the lower neighbour sees: weathered stone from its level up to under the rim
        for (let y = Math.max(low + 1, h - 16); y < h; y++) if (FACE.has(api.get(lx, y, lz))) api.set(lx, y, lz, STONE);
        if (drop >= 3 && api.get(lx, h, lz) === MOSS && api.rand(61, wx, h, wz) < BARE_RIM) api.set(lx, h, lz, STONE);
        continue;
      }
      if (api.get(lx, h, lz) !== MOSS) continue;
      const cell = api.rand(62, wx >> 2, 0, wz >> 2);
      if (cell < GRASS_CELL && api.rand(63, wx, h, wz) < GRASS_IN_CELL) api.set(lx, h, lz, GRASS);
      else if (cell > BARE_CELL && api.rand(64, wx, h, wz) < BARE_IN_CELL) api.set(lx, h, lz, STONE);
    }
  }
}

// a pillar of `n` drums from y0 up, with a capital on top when `cap`
function pillar(api: any, lx: number, y0: number, lz: number, n: number, cap: boolean) {
  for (let k = 0; k < n; k++) api.set(lx, y0 + k, lz, DRUM, true);
  if (cap) api.set(lx, y0 + n, lz, CAPITAL, true);
}

// every cell in the biome, free, the highest at most `step` over the lowest; the heights, or null
function footprint(env: Env, cells: Cell[], step = 2) {
  const hs: number[] = [];
  for (const [lx, lz] of cells) {
    const h = env.free(lx, lz);
    if (h < 0) return null;
    hs.push(h);
  }
  return Math.max(...hs) - Math.min(...hs) <= step ? hs : null;
}

// the chunk's ruin: its kind is drawn once, then up to RUIN_TRIES spots and directions are tried until its footprint fits
function placeRuin(env: Env) {
  const { roll } = env;
  if (roll(71) >= RUIN_ODDS) return;
  const kind = roll(75);
  for (let t = 0; t < RUIN_TRIES; t++) {
    const cx = 3 + Math.floor(roll(72 + 100 * t) * 10), cz = 3 + Math.floor(roll(73 + 100 * t) * 10), alongX = roll(74 + 100 * t) < 0.5;
    if (buildRuin(env, kind, cx, cz, alongX)) return;
  }
}

// one ruin of the given kind around (cx, cz), along x or z; false when its footprint does not fit there
function buildRuin(env: Env, kind: number, cx: number, cz: number, alongX: boolean) {
  const { api, roll } = env;
  const at = (i: number, k = 0): Cell => (alongX ? [cx + i, cz + k] : [cx + k, cz + i]);
  if (kind < 0.28) {
    // a fallen pillar: the stump standing at -1, the drums lying from 0 to len-1, the capital at len
    const len = 2 + Math.floor(roll(76) * 3), stump = 1 + Math.floor(roll(77) * 2);
    const cells: Cell[] = [];
    for (let i = -1; i <= len; i++) cells.push(at(i - 1));
    const hs = footprint(env, cells);
    if (!hs) return false;
    const [sx, sz] = cells[0];
    pillar(api, sx, hs[0] + 1, sz, stump, false);
    for (let i = 1; i <= len; i++) { const [x, z] = cells[i]; api.set(x, hs[i] + 1, z, alongX ? DRUM_X : DRUM_Z, true); }
    const [ex, ez] = cells[len + 1];
    api.set(ex, hs[len + 1] + 1, ez, CAPITAL, true);
  } else if (kind < 0.46) {
    // a colonnade: two pillars `gap` apart, the lintel over them — or broken: one pillar short, the lintel's piece fallen
    const gap = 3 + Math.floor(roll(78) * 2), tall = 3 + Math.floor(roll(79) * 2), broken = roll(80) < 0.5;
    const cells: Cell[] = [];
    for (let i = -2; i <= gap - 1; i++) for (const k of [0, 1]) cells.push(at(i, k));
    const hs = footprint(env, cells);
    if (!hs) return false;
    const base = Math.max(...hs) + 1, top = base + tall; // the capitals at `top`, the lintel over them
    const [ax, az] = at(-2), [bx, bz] = at(gap - 1);
    pillar(api, ax, env.ground(ax, az) + 1, az, top - env.ground(ax, az) - 1, true);
    if (broken) {
      pillar(api, bx, env.ground(bx, bz) + 1, bz, 1 + Math.floor(roll(81) * 2), false);
      for (let i = -2; i <= Math.floor(gap / 2) - 2; i++) { const [x, z] = at(i); api.set(x, top + 1, z, STONE, true); }
      for (let i = 0; i < 3; i++) { const [x, z] = at(i - 1, 1); api.set(x, env.ground(x, z) + 1, z, STONE, true); } // the fallen piece
    } else {
      pillar(api, bx, env.ground(bx, bz) + 1, bz, top - env.ground(bx, bz) - 1, true);
      for (let i = -2; i <= gap - 1; i++) { const [x, z] = at(i); api.set(x, top + 1, z, STONE, true); }
    }
  } else if (kind < 0.68) {
    // a broken statue on a weathered plinth, a rune stone on each side, a drum lying in front
    const cells: Cell[] = [];
    for (let i = -2; i <= 2; i++) cells.push(at(i));
    cells.push(at(-1, 2), at(1, 2), at(0, 1), at(0, -1));
    const hs = footprint(env, cells);
    if (!hs) return false;
    const g = env.ground(cx, cz);
    api.set(cx, g + 1, cz, STONE, true);
    api.set(cx, g + 2, cz, STATUE, true);
    for (const i of [-2, 2]) {
      const [x, z] = at(i), gy = env.ground(x, z);
      api.set(x, gy + 1, z, RUNE, true);
      if (roll(82 + i) < 0.5) api.set(x, gy + 2, z, RUNE, true);
    }
    const [fx, fz] = at(roll(85) < 0.5 ? -1 : 1, 2);
    api.set(fx, env.ground(fx, fz) + 1, fz, alongX ? DRUM_X : DRUM_Z, true);
  } else if (kind < 0.86) {
    // an obelisk: toppled (its stub, then the shaft lying, a carved rune in it) or, now and then, still standing
    const len = 4 + Math.floor(roll(86) * 3);
    if (roll(87) < 0.3) {
      const hs = footprint(env, [at(0), at(1), at(0, 1), at(1, 1)]);
      if (!hs) return false;
      const g = env.ground(cx, cz);
      for (let k = 1; k <= len; k++) api.set(cx, g + k, cz, k === len - 1 ? RUNE : STONE, true);
      api.set(cx, g + len + 1, cz, CAPITAL, true);
      return true;
    }
    const cells: Cell[] = [];
    for (let i = 0; i <= len; i++) cells.push(at(i - 2));
    const hs = footprint(env, cells);
    if (!hs) return false;
    const [sx, sz] = cells[0];
    api.set(sx, hs[0] + 1, sz, STONE, true);
    api.set(sx, hs[0] + 2, sz, STONE, true);
    const rune = 2 + Math.floor(roll(88) * (len - 2));
    for (let i = 1; i <= len; i++) { const [x, z] = cells[i]; api.set(x, hs[i] + 1, z, i === rune ? RUNE : STONE, true); }
  } else {
    // a ring of rune stones around a bare stone floor
    const n = 6 + Math.floor(roll(89) * 3), cells: Cell[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 2 * Math.PI + roll(90);
      cells.push([cx + Math.round(Math.cos(a) * 3), cz + Math.round(Math.sin(a) * 3)]);
    }
    const hs = footprint(env, cells.concat([[cx, cz]]), 2);
    if (!hs) return false;
    cells.forEach(([x, z], k) => {
      const g = hs[k];
      api.set(x, g + 1, z, RUNE, true);
      if (api.rand(91, api.x0 + x, g, api.z0 + z) < 0.45) api.set(x, g + 2, z, RUNE, true);
    });
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, z = cz + dz;
      if (env.free(x, z) >= 0) api.set(x, env.ground(x, z), z, STONE);
    }
  }
  return true;
}

// loose pieces and tall grass (only on free ground of the biome, never on a ruin)
function placeLoose({ api, free }: Env) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const h = free(lx, lz);
      if (h < 0) continue;
      const wx = api.x0 + lx, wz = api.z0 + lz, top = api.get(lx, h, lz), r = api.rand(65, wx, h, wz);
      if (r < LONE_RUNE) api.set(lx, h + 1, lz, RUNE, true);
      else if (r < LONE_RUNE + LONE_DRUM) pillar(api, lx, h + 1, lz, 1 + Math.floor(api.rand(66, wx, h, wz) * 2), false);
      else if (r < LONE_RUNE + LONE_DRUM + LONE_FALLEN) api.set(lx, h + 1, lz, api.rand(67, wx, h, wz) < 0.5 ? DRUM_X : DRUM_Z, true);
      else if (top === GRASS && api.rand(68, wx, h, wz) < TALL_GRASS_ODDS) api.set(lx, h + 1, lz, TALL_GRASS, true);
    }
  }
}
