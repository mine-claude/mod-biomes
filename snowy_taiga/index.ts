// @ts-check
// Taiga Nevada (biomes:snowy_taiga): a cold, humid conifer forest under snow — tall narrow spruces with tiered, snow-capped
// branches, dead snags and fallen logs, frosty grass showing through in thawed patches, red frost berries, icicles and
// pinecones, and now and then a hot spring vent steaming in a ring of melted ground. The cold, HUMID corner of the climate
// (the cold dry corner is the Planalto das Ruínas'). Everything of it is registered by ONE call, registerSnowyTaiga(ctx),
// from src/main.ts:
//   - its textures (textures/snowy_taiga/*.png, painted by snowy_taiga/art.ts through tools/gen-textures.ts)
//   - its blocks: spruce log, spruce needles, snowy needles, snow layer (2/16 thin), frost berry bush, icicle, pinecone and
//     the hot spring vent — the last five are NON-CUBE (`geometry` boxes); the vent also has a live steam plume
//     (ctx.render.blockEntity, snowy_taiga/steam.ts)
//   - one item: frost berries (food), dropped by the bush
//   - the biome itself: the base game's full Snow block as the surface (the base game has no thin snow, hence the layer)
//   - one decoration step (feature): the floor, the conifers, snags, logs, bushes, cones, the vent (snowy_taiga/feature.ts)
//   - cheap recipes: a spruce log gives planks; frost berries give red dye
import { ns } from '../src/names.ts';
import { decorateSnowyTaiga } from './feature.ts';
import { SteamRenderer } from './steam.ts';
import { nicheOf } from '../src/niches.ts';

export const SNOWY_TAIGA = ns('snowy_taiga'); // 'biomes:snowy_taiga' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  log: ns('spruce_log'), needles: ns('spruce_needles'), snowy: ns('snowy_needles'), layer: ns('snow_layer'), bush: ns('frost_berry_bush'),
  icicle: ns('icicle'), cone: ns('pinecone'), vent: ns('hot_spring_vent'),
});
export const BERRIES = ns('frost_berries');
// cold (well below the temperate biomes) and humid (the humidity noise above 0.05; the dry side is the ruins' plateau)
export const CLIMATE = Object.freeze({ temp: [-1, -0.2], humidity: [0.05, 1] });

const TEXTURES = ['spruce_log_side', 'spruce_log_top', 'spruce_needles', 'snowy_needles_top', 'snowy_needles_side', 'frost_berry_bush',
  'frost_berries', 'icicle', 'pinecone', 'hot_spring_vent_top', 'hot_spring_vent_side'];

/** A box of a model in pixels (16 per block). */
const px = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];
// small see-through things you walk through, broken at once
const small = (name: string, tile: string, model: number[][], extra: Record<string, unknown> = {}) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, replaceable: true,
  tiles: { top: tile, side: tile, bottom: tile }, geometry: { model }, ...extra,
});

export const SNOW_LAYER_MODEL = [px(0, 0, 0, 16, 2, 16)];
export const BUSH_MODEL = [px(2, 0, 2, 14, 7, 14), px(3, 7, 3, 13, 10, 13), px(5, 10, 5, 11, 12, 11)];
export const ICICLE_MODEL = [px(7, 2, 7, 9, 16, 9), px(4, 8, 5, 6, 16, 7), px(10, 6, 10, 12, 16, 12), px(11, 11, 4, 12, 16, 5)];
export const PINECONE_MODEL = [px(4, 0, 6, 12, 3, 10), px(5, 3, 7, 11, 4, 9), px(12, 1, 7, 14, 2, 9)];
export const VENT_MODEL = [px(0, 0, 0, 16, 5, 16), px(0, 5, 0, 16, 8, 3), px(0, 5, 13, 16, 8, 16), px(0, 5, 3, 3, 8, 13), px(13, 5, 3, 16, 8, 13)];

/** @param {any} ctx */
export function registerSnowyTaiga(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/snowy_taiga/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('spruce_log', {
    name: 'Tronco de Abeto', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('spruce_log_top'), side: tx('spruce_log_side'), bottom: tx('spruce_log_top') },
  });
  // like the base game's leaves: solid, see-through, quick to break, nothing drops
  ctx.blocks.register('spruce_needles', {
    name: 'Agulhas de Abeto', solid: true, cutout: true, transparent: true, hardness: 0.2, drop: null,
    tiles: { top: tx('spruce_needles'), side: tx('spruce_needles'), bottom: tx('spruce_needles') },
  });
  // the top of a tier: snow on the top face (and a fringe of it down the sides), the needles underneath
  ctx.blocks.register('snowy_needles', {
    name: 'Agulhas Nevadas', solid: true, cutout: true, transparent: true, hardness: 0.2, drop: null,
    tiles: { top: tx('snowy_needles_top'), side: tx('snowy_needles_side'), bottom: tx('spruce_needles') },
  });
  // a thin blanket of snow (2/16) on the ground, on logs and stubs: the base game's snow texture, walked through
  ctx.blocks.register('snow_layer', small('Camada de Neve', 'snow', SNOW_LAYER_MODEL, { cutout: false, needsFloor: true, hardness: 0.1, tool: 'shovel' }));
  // a low evergreen bush of red berries: breaking it gives frost berries
  ctx.blocks.register('frost_berry_bush', small('Arbusto de Frutinha-do-gelo', tx('frost_berry_bush'), BUSH_MODEL, {
    needsFloor: true, replaceable: false, drop: BERRIES, chanceDrop: { item: BERRIES, chance: 0.5 },
  }));
  // icicles hang under the snowy branches and stubs (decorative; nothing holds them up, they need no floor)
  ctx.blocks.register('icicle', small('Pingente de Gelo', tx('icicle'), ICICLE_MODEL, { replaceable: false }));
  ctx.blocks.register('pinecone', small('Pinha', tx('pinecone'), PINECONE_MODEL, { needsFloor: true }));
  // the hot spring vent: a low stone basin with a mineral crust; it steams (steam.ts). Stood on like a slab.
  ctx.blocks.register('hot_spring_vent', {
    name: 'Fonte Termal', solid: true, hardness: 1.5, tool: 'pickaxe',
    tiles: { top: tx('hot_spring_vent_top'), side: tx('hot_spring_vent_side'), bottom: tx('hot_spring_vent_side') },
    geometry: { model: VENT_MODEL },
  });
  ctx.render.blockEntity('hot_spring_vent', new SteamRenderer());

  ctx.items.register('frost_berries', {
    name: 'Frutinhas-do-gelo', icon: tx('frost_berries'), group: 'mineclaude:items', stack: 64, food: 2,
  });

  ctx.worldgen.biome('snowy_taiga', {
    name: 'Taiga Nevada',
    climate: { temp: [CLIMATE.temp[0], CLIMATE.temp[1]], humidity: [CLIMATE.humidity[0], CLIMATE.humidity[1]] },
    weight: 60,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('snowy_taiga'),
    surface: 'mineclaude:snow', filler: 'mineclaude:dirt', // the base game's full snow block (snow on top, earth on the sides)
    treeDensity: 0, // no broadleaf trees: the conifers are the feature's
    grassDensity: 0.25, // a few frosty tufts of tall grass poke out of the snow
    color: '#6fb6c8', // a cool frosty blue-green (normalized by the engine: the hue moves, not the brightness) for the grass of the thawed patches and the tufts
  });
  ctx.worldgen.feature('snowy_taiga_decor', { biomes: [SNOWY_TAIGA], run: (api: any) => decorateSnowyTaiga(api) });

  ctx.recipes.add({ key: 'planks_from_spruce_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.log, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'dye_red_from_frost_berries', out: 'mineclaude:dye_red', n: 1, in: [[BERRIES, 2]], category: 'mineclaude:misc' });
}
