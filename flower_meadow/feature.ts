// @ts-check
// The decoration step of the Prado Florido. Runs once per chunk whose centre is in the biome (the step's `biomes` filter)
// and then asks the biome of EACH column, so a chunk on the edge only decorates its meadow side.
// Pure: only api.rand / api.get / api.set / api.heightAt / api.biomeAt — every side generates the same chunk. It only reads
// and writes this chunk, so the result does not depend on the order chunks are generated in.
import { ns } from '../src/names.ts';

const BIOME = ns('flower_meadow');
export const FLOWERS = Object.freeze([ns('starflower'), ns('bellflower'), ns('cupflower'), ns('laceflower')]);
const HIVE = ns('wild_hive');
const AIR = 'mineclaude:air', GRASS = 'mineclaude:grass', TALL_GRASS = 'mineclaude:tall_grass', LOG = 'mineclaude:log';
const CANOPY = 12; // how far above the ground a lone tree's trunk is looked for

// odds (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const FLOWER_ON_GRASS = 0.2, FLOWER_FOR_TALL_GRASS = 0.25, HIVE_ON_TREE = 0.6;
const PATCH = 5; // flowers grow in patches of one kind, about PATCH x PATCH blocks

/** @param {import('../../../packages/cli/types/mineclaude-mod').WorldgenApi} api */
export function decorateFlowerMeadow(api: any) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      if (api.biomeAt(wx, wz) !== BIOME) continue;
      const h = api.heightAt(wx, wz);
      if (api.get(lx, h, lz) === GRASS) {
        // the carpet of flowers: on bare grass and in place of some tall grass; the kind is the patch's (a jittered grid),
        // with now and then a stray of another kind
        const above = api.get(lx, h + 1, lz);
        if ((above === AIR && api.rand(21, wx, h, wz) < FLOWER_ON_GRASS) || (above === TALL_GRASS && api.rand(22, wx, h, wz) < FLOWER_FOR_TALL_GRASS)) {
          const px = Math.floor((wx + api.rand(23, wz) * 3) / PATCH), pz = Math.floor((wz + api.rand(24, wx) * 3) / PATCH);
          const stray = api.rand(25, wx, h, wz) < 0.12;
          const kind = Math.floor(api.rand(stray ? 26 : 27, stray ? wx : px, 0, stray ? wz : pz) * FLOWERS.length);
          api.set(lx, h + 1, lz, FLOWERS[kind]);
        }
      }
      // a lone tree: now and then a wild hive hangs under its leaves, beside the trunk's top
      if (api.get(lx, h + 1, lz) !== LOG) continue; // a trunk starts right on the ground
      let top = -1;
      for (let y = h + 1; y <= h + CANOPY; y++) if (api.get(lx, y, lz) === LOG) top = y;
      if (top < h + 5 || api.rand(28, wx, top, wz) >= HIVE_ON_TREE) continue;
      const side = Math.floor(api.rand(29, wx, top, wz) * 4);
      const hx = lx + (side === 0 ? 1 : side === 1 ? -1 : 0), hz = lz + (side === 2 ? 1 : side === 3 ? -1 : 0);
      if (api.biomeAt(api.x0 + hx, api.z0 + hz) !== BIOME) continue;
      // under the crown (leaves at top - 2), the cell beside the trunk at top - 3 (at least 2 above the ground) is air: the hive hangs there
      const y = top - 3;
      if (api.get(hx, y, hz) === AIR && api.get(hx, y + 1, hz) !== AIR && api.get(hx, y + 1, hz) !== null) api.set(hx, y, hz, HIVE);
    }
  }
}
