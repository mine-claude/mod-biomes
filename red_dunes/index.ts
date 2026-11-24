// @ts-check
// Dunas Vermelhas (biomes:red_dunes): a hot, dry land of red sand dunes on the edge of the deserts — the home of the Dune
// Widow (creatures:dune_widow). Everything of it is registered by ONE call, registerRedDunes(ctx), from src/main.ts (the
// content entry: server, page, mesher Worker and the hosted Worker all run it, so they all generate the same chunks):
//   - its textures (textures/red_dunes/*.png, painted by red_dunes/art.ts through tools/gen-textures.ts)
//   - its blocks: red sand (the floor, falls like sand), banded sandstone (the filler and the rocks), column cactus,
//     fossil bone, dry shrub
//   - the biome itself: a climate band of hot and dry ground just below the desert's temperature (the base game's own
//     desert columns stay its yellow sand: only grass columns take a biome's floor), no trees, no tall grass
//   - one terrain step (red_dunes/terrain.ts): rolling dunes, only in the biome's columns, fading at its edge
//   - one decoration step (red_dunes/feature.ts): cacti, shrubs, fossil ribcages, sandstone outcrops and arches
//   - cheap recipes: red sand smelts into glass, four red sand make banded sandstone, a fossil bone gives bones
import { ns } from '../src/names.ts';
import { decorateRedDunes } from './feature.ts';
import { shapeRedDunes } from './terrain.ts';
import { nicheOf } from '../src/niches.ts';
import { skeletonProps } from './skeleton.ts';

export const RED_DUNES = ns('red_dunes'); // 'biomes:red_dunes' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  sand: ns('red_sand'), sandstone: ns('banded_sandstone'), cactus: ns('column_cactus'), bone: ns('fossil_bone'), shrub: ns('dry_shrub'),
});

const TEXTURES = ['red_sand', 'banded_sandstone_side', 'banded_sandstone_top', 'column_cactus_side', 'column_cactus_top', 'fossil_bone_side', 'fossil_bone_top', 'dry_shrub'];

/** @param {any} ctx */
export function registerRedDunes(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/red_dunes/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('red_sand', {
    name: 'Areia Vermelha', solid: true, gravity: true, hardness: 0.5, tool: 'shovel',
    tiles: { top: tx('red_sand'), side: tx('red_sand'), bottom: tx('red_sand') },
  });
  ctx.blocks.register('banded_sandstone', {
    name: 'Arenito Listrado', solid: true, hardness: 0.8, tool: 'pickaxe',
    tiles: { top: tx('banded_sandstone_top'), side: tx('banded_sandstone_side'), bottom: tx('banded_sandstone_top') },
  });
  ctx.blocks.register('column_cactus', {
    name: 'Cacto-coluna', solid: true, hardness: 0.4,
    tiles: { top: tx('column_cactus_top'), side: tx('column_cactus_side'), bottom: tx('column_cactus_top') },
  });
  ctx.blocks.register('fossil_bone', {
    name: 'Osso Fóssil', solid: true, hardness: 1.5, tool: 'pickaxe',
    tiles: { top: tx('fossil_bone_top'), side: tx('fossil_bone_side'), bottom: tx('fossil_bone_top') },
  });
  ctx.blocks.register('dry_shrub', {
    name: 'Arbusto Seco', solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
    tiles: { top: tx('dry_shrub'), side: tx('dry_shrub'), bottom: tx('dry_shrub') },
  });

  ctx.worldgen.biome('red_dunes', {
    name: 'Dunas Vermelhas',
    // hot and dry: the base game's temperature just below its desert (~0.18; the biome's jitter is +-0.04, so a band that
    // ends at 0.14 keeps the yellow desert out of it) and the dry half of the biome humidity noise
    climate: { temp: [-0.04, 0.14], humidity: [-1, -0.02] },
    weight: 40,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('red_dunes'),
    surface: BLOCKS.sand, filler: BLOCKS.sandstone,
    treeDensity: 0, grassDensity: 0,
    color: '#b8a04a', // the tint of grass where a column keeps grass (sun-dried)
  });
  // no `biomes` filter: in terrain 2 the dunes fade in over the border band, into the neighbour's edge too (terrain.ts); in
  // terrain 1 the step itself keeps to the biome's own columns, as the filter did
  ctx.worldgen.terrain('red_dunes_shape', { run: (api: any) => shapeRedDunes(api) });
  ctx.worldgen.feature('red_dunes_decor', { biomes: [RED_DUNES], run: (api: any) => decorateRedDunes(api) });

  ctx.recipes.add({ key: 'glass_from_red_sand', type: 'smelting', out: 'mineclaude:glass', n: 1, in: [[BLOCKS.sand, 1], ['mineclaude:coal', 1]], station: 'furnace', category: 'mineclaude:furnace_blocks' });
  ctx.recipes.add({ key: 'banded_sandstone_from_red_sand', out: BLOCKS.sandstone, n: 1, in: [[BLOCKS.sand, 4]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'bones_from_fossil', out: 'mineclaude:bone', n: 3, in: [[BLOCKS.bone, 1]], category: 'mineclaude:misc' });
}

/**
 * The fossil skeleton (red_dunes/skeleton.ts): one hidden block whose states are the shaped parts of a skeleton, laid by the
 * terrain-2 decoration. Registered LAST of the biomes mod (src/main.ts), after every block that existed before it: a new
 * block is appended, it never shifts another one (and saved worlds store mod blocks by name anyway).
 * @param {any} ctx
 */
export function registerFossilSkeleton(ctx: any) {
  ctx.textures.png('fossil_skeleton', 'textures/red_dunes/fossil_skeleton.png', { size: 16 });
  ctx.blocks.register('fossil_skeleton', skeletonProps(ns('fossil_skeleton'), BLOCKS.bone));
}
