// @ts-check
// Floresta Musgosa (biomes:mossy_forest): a cool, humid forest whose floor is a carpet of moss. Everything of it is
// registered by ONE call, registerMossyForest(ctx), from src/main.ts (the content entry: server, page, mesher Worker and the
// hosted Worker all run it, so they all generate the same chunks):
//   - its textures (textures/mossy_forest/*.png, painted by mossy_forest/art.ts through tools/gen-textures.ts)
//   - its blocks: moss carpet (the floor), mossy log, mossy log with shelf fungi, fern, hanging moss
//   - the biome itself (climate band, weight, surface/filler, tree and grass density, tint of its plants)
//   - one decoration step (feature) that only runs in it: mossy trunks, shelf fungi, hanging moss, ferns, fallen logs
//   - a cheap recipe: a mossy log gives planks like any log
import { ns } from '../src/names.ts';
import { decorateMossyForest } from './feature.ts';
import { nicheOf } from '../src/niches.ts';

export const MOSSY_FOREST = ns('mossy_forest'); // 'biomes:mossy_forest' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  carpet: ns('moss_carpet'), log: ns('mossy_log'), shelf: ns('shelf_mushroom'), fern: ns('fern'), hanging: ns('hanging_moss'),
});

const TEXTURES = ['moss_carpet_top', 'moss_carpet_side', 'mossy_log_side', 'mossy_log_top', 'shelf_mushroom_side', 'fern', 'hanging_moss'];

// plants drawn as two crossed quads, see-through, walk-through, broken at once
const plant = (name: string, tile: string, extra: Record<string, unknown> = {}) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true,
  tiles: { top: tile, side: tile, bottom: tile }, ...extra,
});

/** @param {any} ctx */
export function registerMossyForest(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/mossy_forest/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('moss_carpet', {
    name: 'Tapete de Musgo', solid: true, hardness: 0.6, tool: 'shovel',
    tiles: { top: tx('moss_carpet_top'), side: tx('moss_carpet_side'), bottom: 'dirt' },
  });
  ctx.blocks.register('mossy_log', {
    name: 'Tronco Musgoso', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('mossy_log_top'), side: tx('mossy_log_side'), bottom: tx('mossy_log_top') },
  });
  ctx.blocks.register('shelf_mushroom', {
    name: 'Tronco com Orelha-de-pau', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('mossy_log_top'), side: tx('shelf_mushroom_side'), bottom: tx('mossy_log_top') },
  });
  // the fern takes the biome's colour (`tint: 'biome'`); outside a biome world it keeps its own pale green
  ctx.blocks.register('fern', plant('Samambaia', tx('fern'), { needsFloor: true, tint: 'biome' }));
  // hanging moss grows DOWN from the canopy: it needs no floor
  // … and it is CLIMBABLE (shared/climbing.ts), like a vine: grab it to climb up into the canopy
  ctx.blocks.register('hanging_moss', plant('Barba-de-velho', tx('hanging_moss'), { climbable: true }));

  ctx.worldgen.biome('mossy_forest', {
    name: 'Floresta Musgosa',
    // cool to mild and humid: the base game's temperature (desert above ~0.18) and the biome humidity noise
    climate: { temp: [-0.45, 0.12], humidity: [0.05, 1] },
    weight: 40,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('mossy_forest'),
    surface: BLOCKS.carpet, filler: 'mineclaude:dirt',
    treeDensity: 2, grassDensity: 0.6,
    color: '#4f9a3a', // the tint of its ferns (and of grass, where a column keeps grass)
  });
  ctx.worldgen.feature('mossy_forest_decor', { biomes: [MOSSY_FOREST], run: (api: any) => decorateMossyForest(api) });

  ctx.recipes.add({ key: 'planks_from_mossy_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.log, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'planks_from_shelf_mushroom', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.shelf, 1]], category: 'mineclaude:building_blocks' });
}
