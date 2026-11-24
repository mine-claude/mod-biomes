// @ts-check
// The decoration step of the Dunas Vermelhas. Runs once per chunk whose centre is in the biome (the step's `biomes` filter)
// and then asks the biome of EACH column, so a chunk on the edge only decorates its dune side.
// Pure: only api.rand / api.get / api.set / api.heightAt / api.biomeAt. Everything it writes stays inside this chunk (set
// outside it is ignored, and the arrangements below are placed whole inside it), and it only reads this chunk, so the result
// does not depend on the order chunks are generated in. In order (the big pieces first, so the plants grow around them):
//   - a banded sandstone outcrop (a weathered mound) or an arch (two pillars and a span);
//   - a fossil ribcage half buried: a spine flush with the sand, ribs rising on both sides, a skull at one end;
//   - column cacti (2..5 tall, the tall ones with an arm), dry shrubs, a lone bone sticking out of the sand now and then.
// Terrain 1 (api.terrain 1: every world made before terrain 2) places the cube fossil bones exactly as it always did, so those
// worlds stay byte-identical; terrain 2 lays the same fossils out of the shaped skeleton parts (skeleton.ts): vertebrae,
// ribs, a skull with its snout, long bones and fragments, each turned to fit — and a lone bone is a long bone lying there.
import { ns } from '../src/names.ts';
import { SKELETON, skeletonLayout, type Facing } from './skeleton.ts';

const BIOME = ns('red_dunes');
const SAND = ns('red_sand'), STONE = ns('banded_sandstone'), CACTUS = ns('column_cactus'), BONE = ns('fossil_bone'), SHRUB = ns('dry_shrub');
const AIR = 'mineclaude:air';

// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const CACTUS_ODDS = 0.008, SHRUB_ODDS = 0.035, LONE_BONE_ODDS = 0.0025, FOSSIL_ODDS = 0.2, ROCK_ODDS = 0.22, ARCH_SHARE = 0.4;

type Cell = [number, number];
type Env = {
  api: any;
  shaped: boolean; // terrain 2: the skeleton parts instead of cube bones
  roll: (salt: number) => number; // a per-chunk roll (api.rand with the chunk corner: without coordinates it is the same in every chunk)
  isDune: (lx: number, lz: number) => boolean;
  groundY: (lx: number, lz: number) => number;
  sandTop: (lx: number, lz: number) => number;
  inChunk: (lx: number, lz: number) => boolean;
};

/** @param {any} api */
export function decorateRedDunes(api: any) {
  const env: Env = {
    api,
    shaped: api.terrain === 2,
    roll: (salt) => api.rand(salt, api.x0, 0, api.z0),
    isDune: (lx, lz) => api.biomeAt(api.x0 + lx, api.z0 + lz) === BIOME,
    groundY: (lx, lz) => api.heightAt(api.x0 + lx, api.z0 + lz),
    // the height of a column whose top is red sand with air over it, else -1
    sandTop: (lx, lz) => {
      const h = api.heightAt(api.x0 + lx, api.z0 + lz);
      return api.get(lx, h, lz) === SAND && api.get(lx, h + 1, lz) === AIR ? h : -1;
    },
    inChunk: (lx, lz) => lx >= 0 && lx < 16 && lz >= 0 && lz < 16,
  };
  placeRock(env);
  placeFossil(env);
  placePlants(env);
}

// a banded sandstone outcrop or arch, rising from the dunes
function placeRock({ api, roll, isDune, groundY, sandTop, inChunk }: Env) {
  if (roll(41) >= ROCK_ODDS) return;
  const cx = 4 + Math.floor(roll(42) * 8), cz = 4 + Math.floor(roll(43) * 8);
  if (!isDune(cx, cz) || sandTop(cx, cz) < 0) return;
  if (roll(44) < ARCH_SHARE) {
    // an arch: two pillars two wide, a gap of 3..4 between them, a span on top with a corbel under each end
    const alongX = roll(45) < 0.5, gap = 3 + Math.floor(roll(46) * 2), tall = 4 + Math.floor(roll(47) * 2);
    const at = (i: number, k: number): Cell => (alongX ? [cx - 3 + i, cz + k] : [cx + k, cz - 3 + i]);
    const width = gap + 2; // pillar, gap, pillar (i = 0 .. gap + 1)
    const foot: Cell[] = [];
    for (let i = 0; i < width; i++) for (const k of [0, 1]) foot.push(at(i, k));
    if (!foot.every(([lx, lz]) => inChunk(lx, lz) && isDune(lx, lz) && sandTop(lx, lz) >= 0)) return;
    const top = Math.max(...foot.map(([lx, lz]) => groundY(lx, lz))) + tall;
    for (const i of [0, width - 1]) for (const k of [0, 1]) {
      const [px, pz] = at(i, k);
      for (let y = groundY(px, pz) + 1; y <= top; y++) api.set(px, y, pz, STONE, true);
    }
    for (let i = 1; i < width - 1; i++) for (const k of [0, 1]) {
      const [sx, sz] = at(i, k);
      api.set(sx, top, sz, STONE, true);
      if (i === 1 || i === width - 2) api.set(sx, top - 1, sz, STONE, true);
    }
    return;
  }
  // an outcrop: a weathered mound, taller in the middle, ragged at the rim
  const rad = 2 + roll(48) * 1.5, tall = 2 + Math.floor(roll(49) * 3);
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const lx = cx + dx, lz = cz + dz, d = Math.hypot(dx, dz) / rad;
    if (d >= 1 || !inChunk(lx, lz) || !isDune(lx, lz) || sandTop(lx, lz) < 0) continue;
    const k = Math.round((1 - d) * tall + api.rand(50, api.x0 + lx, 0, api.z0 + lz) * 1.2 - 0.3);
    const g = groundY(lx, lz);
    for (let y = g + 1; y <= g + k; y++) api.set(lx, y, lz, STONE, true);
  }
}

// a fossil ribcage, half buried: needs every cell in the biome, on red sand, within a step of the spine's start
function placeFossil({ api, shaped, roll, isDune, groundY, sandTop, inChunk }: Env) {
  if (roll(31) >= FOSSIL_ODDS) return;
  const alongX = roll(32) < 0.5, len = 5 + Math.floor(roll(33) * 3); // 5..7
  const a0 = 2 + Math.floor(roll(34) * (12 - len)), b0 = 2 + Math.floor(roll(35) * 11);
  const at = (i: number, side: number): Cell => (alongX ? [a0 + i, b0 + side] : [b0 + side, a0 + i]);
  const cells: Cell[] = [];
  for (let i = -1; i <= len; i++) for (const s of [-1, 0, 1]) cells.push(at(i, s));
  const y0 = groundY(...at(0, 0));
  const fits = ([lx, lz]: Cell) => inChunk(lx, lz) && isDune(lx, lz) && sandTop(lx, lz) >= 0 && Math.abs(groundY(lx, lz) - y0) <= 1;
  if (!cells.every(fits)) return;
  if (shaped) {
    // the same cells, the skeleton's parts lying on the sand; the snout only where the cell in front of the skull is free too
    const head: Facing = alongX ? 'w' : 'n', side: Facing = alongX ? 's' : 'e'; // -i is the head end; +s is +z (along x) or +x
    for (const p of skeletonLayout(len, head, side, roll(36), fits(at(-2, 0)), roll(37))) {
      const [lx, lz] = at(p.i, p.s);
      api.set(lx, groundY(lx, lz) + p.dy, lz, { block: SKELETON, properties: { part: p.part, facing: p.facing } }, true);
    }
    return;
  }
  for (let i = 0; i < len; i++) {
    const [sx, sz] = at(i, 0);
    api.set(sx, groundY(sx, sz), sz, BONE); // the spine, flush with the sand
    if (i % 2 === 1 && i < len - 1) {
      for (const s of [-1, 1]) {
        const [rx, rz] = at(i, s), ry = groundY(rx, rz);
        api.set(rx, ry + 1, rz, BONE, true);
        if (i !== 1) api.set(rx, ry + 2, rz, BONE, true); // the ribs nearer the middle stand taller
      }
    }
  }
  const [kx, kz] = at(-1, 0), ky = groundY(kx, kz); // the skull at the head end
  api.set(kx, ky + 1, kz, BONE, true);
  api.set(kx, ky, kz, BONE);
}

// single plants: cacti, shrubs, a lone bone (only on free red sand: never on a rock or a fossil)
function placePlants({ api, shaped, isDune, groundY, sandTop, inChunk }: Env) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      if (!isDune(lx, lz)) continue;
      const h = sandTop(lx, lz);
      if (h < 0) continue;
      const r = api.rand(21, wx, h, wz);
      if (r < CACTUS_ODDS) {
        const tall = 2 + Math.floor(api.rand(22, wx, h, wz) * 4); // 2..5
        for (let y = h + 1; y <= h + tall; y++) api.set(lx, y, lz, CACTUS, true);
        if (tall >= 4 && api.rand(23, wx, h, wz) < 0.6) {
          // an arm: out to one side at mid height, then up
          const d = Math.floor(api.rand(24, wx, h, wz) * 4), ax = lx + [1, -1, 0, 0][d], az = lz + [0, 0, 1, -1][d], ay = h + 2 + Math.floor(api.rand(25, wx, h, wz) * (tall - 3));
          if (inChunk(ax, az) && isDune(ax, az) && api.get(ax, ay, az) === AIR && api.get(ax, ay + 1, az) === AIR && groundY(ax, az) < ay - 1) {
            api.set(ax, ay, az, CACTUS, true);
            api.set(ax, ay + 1, az, CACTUS, true);
          }
        }
      } else if (r < CACTUS_ODDS + SHRUB_ODDS) api.set(lx, h + 1, lz, SHRUB, true);
      else if (r < CACTUS_ODDS + SHRUB_ODDS + LONE_BONE_ODDS) {
        // terrain 2: a long bone lying on the sand, turned any way; terrain 1: the cube, as always
        if (shaped) api.set(lx, h + 1, lz, { block: SKELETON, properties: { part: 'femur', facing: (['n', 'e', 's', 'w'] as const)[Math.floor(api.rand(26, wx, h, wz) * 4)] } }, true);
        else api.set(lx, h + 1, lz, BONE, true);
      }
    }
  }
}
