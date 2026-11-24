// @ts-check
// Geodos de Cristal (biomes:crystal_geodes): hollow crystal chambers deep in the stone — the home of the Crystal Beetle
// (creatures:crystal_beetle). Not a surface biome: biomes are climate and ground, and a geode is UNDERGROUND, so it is a
// big declarative structure that can sit under ANY biome (one chance per region of 4 x 4 chunks), only in worlds WITH biomes.
// Everything of it is registered by ONE call, registerCrystalGeodes(ctx), from src/main.ts (the content entry: server,
// page, mesher Worker and the hosted Worker all run it, so they all generate the same chunks):
//   - its textures (textures/crystal_geodes/*.png, painted by crystal_geodes/art.ts through tools/gen-textures.ts)
//   - its item: the raw crystal shard (Lasca de Cristal), what the clusters drop
//   - its blocks: the three shells (smooth basalt, calcite, amethyst), lit amethyst (a light source), crystal clusters that
//     are NOT cubes (geometry boxes: a standing cluster on the floor, a hanging one under the roof) and the great crystal (a
//     showpiece with a living look drawn by a block entity renderer, render.ts)
//   - one structure step (geode.ts): the chamber, its shells and its crystals, stitched across chunks by the engine
//   - cheap recipes: shards make amethyst, amethyst and shards make lit amethyst
import { ns } from '../src/names.ts';
import { BLOCKS, SIZE, buildGeode } from './geode.ts';
import { greatCrystalRenderer } from './render.ts';

export const CRYSTAL_GEODES = ns('crystal_geodes'); // the step's name; NOT a biome (spawn rules find a geode by its floor)
export { BLOCKS };
export const SHARD = ns('crystal_shard_raw');
export const LIGHT = Object.freeze({ lit: 10, cluster: 6, great: 13 }); // block light (a torch is 14)
export const REGION = 4, CHANCE = 0.8; // at most one geode per 4 x 4 chunks, drawn with this chance (before the depth check)

const TEXTURES = ['geode_basalt', 'calcite', 'amethyst_block', 'lit_amethyst', 'crystal_cluster', 'great_crystal', 'crystal_shard_raw'];

// a standing cluster: five slim crystals of different heights on one cell (boxes, drawn by the mesher; no collision)
const CLUSTER: number[][] = [
  [0.42, 0, 0.4, 0.6, 0.78, 0.58],
  [0.16, 0, 0.5, 0.31, 0.46, 0.65],
  [0.62, 0, 0.18, 0.8, 0.56, 0.36],
  [0.58, 0, 0.64, 0.74, 0.36, 0.8],
  [0.22, 0, 0.18, 0.36, 0.3, 0.32],
];
const flipY = (boxes: number[][]) => boxes.map(([x0, y0, z0, x1, y1, z1]) => [x0, 1 - y1, z0, x1, 1 - y0, z1]);
// the great crystal's own boxes: a stout crystal with a step at its waist (the renderer's tall crystal stands around it)
const GREAT: number[][] = [[0.3, 0, 0.3, 0.7, 0.55, 0.7], [0.36, 0.55, 0.36, 0.64, 0.95, 0.64], [0.43, 0.95, 0.43, 0.57, 1, 0.57]];

/** @param {any} ctx */
export function registerCrystalGeodes(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/crystal_geodes/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);
  const all = (t: string) => ({ top: tx(t), side: tx(t), bottom: tx(t) });

  ctx.items.register('crystal_shard_raw', { name: 'Lasca de Cristal', icon: SHARD, group: 'mineclaude:items', stack: 64 });

  ctx.blocks.register('geode_basalt', { name: 'Basalto Liso', solid: true, hardness: 2.5, tool: 'pickaxe', tiles: all('geode_basalt') });
  ctx.blocks.register('calcite', { name: 'Calcita', solid: true, hardness: 1.2, tool: 'pickaxe', tiles: all('calcite') });
  ctx.blocks.register('amethyst_block', { name: 'Bloco de Ametista', solid: true, footstep: 'glass', hardness: 1.5, tool: 'pickaxe', tiles: all('amethyst_block') });
  // lit amethyst lights the chamber (`light`) and shines itself in the dark (`emissive`)
  ctx.blocks.register('lit_amethyst', { name: 'Ametista Luminosa', solid: true, footstep: 'glass', hardness: 1.5, tool: 'pickaxe', light: LIGHT.lit, emissive: true, tiles: all('lit_amethyst') });
  const cluster = (name: string, boxes: number[][], extra: Record<string, unknown> = {}) => ({
    name, solid: false, noCollide: true, transparent: true, hardness: 0.4, tool: 'pickaxe', light: LIGHT.cluster, emissive: true,
    drop: SHARD, tiles: all('crystal_cluster'), geometry: { model: boxes, rotate: false }, ...extra,
  });
  ctx.blocks.register('crystal_cluster', cluster('Drusa de Cristal', CLUSTER, { needsFloor: true }));
  ctx.blocks.register('crystal_cluster_hanging', cluster('Drusa de Cristal Pendente', flipY(CLUSTER), { hidden: true }));
  ctx.blocks.register('great_crystal', {
    name: 'Grande Cristal', solid: true, transparent: true, hardness: 3, tool: 'pickaxe', light: LIGHT.great, emissive: true,
    tiles: all('great_crystal'), geometry: { model: GREAT, rotate: false },
  });
  ctx.render?.blockEntity?.('great_crystal', greatCrystalRenderer);

  // under any biome, only in worlds with biomes (build() returns at once where biomeAt is null: the base fixture stays the same)
  ctx.worldgen.structure('crystal_geodes', { region: REGION, chance: CHANCE, size: SIZE, build: (api: any) => buildGeode(api) });

  ctx.recipes.add({ key: 'amethyst_from_shards', out: BLOCKS.amethyst, n: 1, in: [[SHARD, 4]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'lit_amethyst', out: BLOCKS.lit, n: 1, in: [[BLOCKS.amethyst, 1], [SHARD, 2]], category: 'mineclaude:building_blocks' });
}
