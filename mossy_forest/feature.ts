// @ts-check
// The decoration step of the Floresta Musgosa. Runs once per chunk whose centre is in the biome (the step's `biomes`
// filter) and then asks the biome of EACH column, so a chunk on the edge only decorates its forest side.
// Pure: only api.rand / api.get / api.set / api.heightAt / api.biomeAt — the server, the page, the mesher Worker and the
// hosted Worker generate the same chunk. Everything it writes stays inside this chunk (set outside it is ignored), and it
// only reads this chunk, so the result does not depend on the order chunks are generated in.
import { ns } from '../src/names.ts';

const BIOME = ns('mossy_forest');
const CARPET = ns('moss_carpet'), LOG = ns('mossy_log'), SHELF = ns('shelf_mushroom'), FERN = ns('fern'), HANGING = ns('hanging_moss');
const AIR = 'mineclaude:air', BASE_LOG = 'mineclaude:log', LEAVES = 'mineclaude:leaves', TALL_GRASS = 'mineclaude:tall_grass';
const CANOPY = 16; // how far above the ground trunks and leaves are looked for

// odds per cell (api.rand salts below are fixed: changing them changes the world, which needs a new worldgenVersion)
const FERN_ON_MOSS = 0.14, FERN_FOR_GRASS = 0.5, HANG_UNDER_LEAF = 0.2, SHELF_ON_TRUNK = 0.16, FALLEN_LOG = 0.45;

/** @param {import('../../../packages/cli/types/mineclaude-mod').WorldgenApi} api */
export function decorateMossyForest(api: any) {
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = api.x0 + lx, wz = api.z0 + lz;
      if (api.biomeAt(wx, wz) !== BIOME) continue;
      const h = api.heightAt(wx, wz);
      // the trunks of the column turn mossy; low on a trunk, now and then a shelf fungus
      for (let y = h + 1; y <= h + CANOPY; y++) {
        const b = api.get(lx, y, lz);
        if (b === BASE_LOG) api.set(lx, y, lz, y <= h + 4 && y >= h + 2 && api.rand(11, wx, y, wz) < SHELF_ON_TRUNK ? SHELF : LOG);
        else if (b === LEAVES && api.get(lx, y - 1, lz) === AIR && api.rand(12, wx, y, wz) < HANG_UNDER_LEAF) api.set(lx, y - 1, lz, HANGING);
      }
      // the floor: ferns on the moss (and in place of some tall grass)
      if (api.get(lx, h, lz) !== CARPET) continue;
      const above = api.get(lx, h + 1, lz);
      if ((above === AIR && api.rand(13, wx, h, wz) < FERN_ON_MOSS) || (above === TALL_GRASS && api.rand(14, wx, h, wz) < FERN_FOR_GRASS)) api.set(lx, h + 1, lz, FERN);
    }
  }
  // a fallen log lying on the moss: 3..5 blocks along x or z, only on flat carpet with air above, entirely in this chunk
  if (api.rand(15, api.x0, 0, api.z0) >= FALLEN_LOG) return;
  const alongX = api.rand(16, api.x0, 0, api.z0) < 0.5, len = 3 + Math.floor(api.rand(17, api.x0, 0, api.z0) * 3);
  const lx0 = 1 + Math.floor(api.rand(18, api.x0, 0, api.z0) * (alongX ? 14 - len : 14)), lz0 = 1 + Math.floor(api.rand(19, api.x0, 0, api.z0) * (alongX ? 14 : 14 - len));
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < len; i++) cells.push(alongX ? [lx0 + i, lz0] : [lx0, lz0 + i]);
  const y0 = api.heightAt(api.x0 + cells[0][0], api.z0 + cells[0][1]);
  for (const [lx, lz] of cells) {
    const wx = api.x0 + lx, wz = api.z0 + lz;
    if (api.biomeAt(wx, wz) !== BIOME || api.heightAt(wx, wz) !== y0 || api.get(lx, y0, lz) !== CARPET) return;
    const above = api.get(lx, y0 + 1, lz);
    if (above !== AIR && above !== FERN && above !== TALL_GRASS) return;
  }
  for (const [lx, lz] of cells) api.set(lx, y0 + 1, lz, LOG);
}
