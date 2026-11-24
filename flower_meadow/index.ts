// @ts-check
// Prado Florido (biomes:flower_meadow): an open, rolling meadow — few trees, very high grass and a carpet of flowers of four
// original kinds, now and then a wild hive under a lone tree. The home of the Sting Swarm (mod creatures). Everything of it
// is registered by ONE call, registerFlowerMeadow(ctx), from src/main.ts:
//   - its textures (textures/flower_meadow/*.png, painted by flower_meadow/art.ts through tools/gen-textures.ts)
//   - its blocks: four flowers (cross plants; every name has "flower" in it, so the swarm sees them as flowers) and the hive
//   - the biome itself (the same temperature band as the Bosque de Copas Altas, but DRY: the two meet at their humidity edge)
//   - one decoration step (feature): the flower carpet in patches, the hives
//   - cheap recipes: each flower gives a dye of its colour
import { ns } from '../src/names.ts';
import { decorateFlowerMeadow } from './feature.ts';
import { nicheOf } from '../src/niches.ts';

export const FLOWER_MEADOW = ns('flower_meadow'); // 'biomes:flower_meadow' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  starflower: ns('starflower'), bellflower: ns('bellflower'), cupflower: ns('cupflower'), laceflower: ns('laceflower'), hive: ns('wild_hive'),
});
// the climate band, shared with the canopy woodland (tall_canopy/index.ts): same temperature, the meadow on the dry side
export const TEMPERATE = Object.freeze([-0.2, 0.18]);
export const HUMIDITY_EDGE = -0.06;

const TEXTURES = ['starflower', 'bellflower', 'cupflower', 'laceflower', 'wild_hive_side', 'wild_hive_top'];

const flower = (name: string, tile: string) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
  tiles: { top: tile, side: tile, bottom: tile },
});

/** @param {any} ctx */
export function registerFlowerMeadow(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/flower_meadow/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('starflower', flower('Flor-de-estrela', tx('starflower')));
  ctx.blocks.register('bellflower', flower('Flor-de-sino', tx('bellflower')));
  ctx.blocks.register('cupflower', flower('Flor-de-taça', tx('cupflower')));
  ctx.blocks.register('laceflower', flower('Flor-de-renda', tx('laceflower')));
  // decorative: a lump of comb hanging under the leaves (see-through corners). Breaking it near a Sting Swarm provokes it
  // (mods/creatures/swarm/index.ts, the same hook as broken flowers).
  ctx.blocks.register('wild_hive', {
    name: 'Colmeia Silvestre', solid: true, cutout: true, transparent: true, hardness: 0.6, tool: 'axe',
    tiles: { top: tx('wild_hive_top'), side: tx('wild_hive_side'), bottom: tx('wild_hive_top') },
  });

  ctx.worldgen.biome('flower_meadow', {
    name: 'Prado Florido',
    climate: { temp: [TEMPERATE[0], TEMPERATE[1]], humidity: [-1, HUMIDITY_EDGE] },
    weight: 40,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('flower_meadow'),
    surface: 'mineclaude:grass', filler: 'mineclaude:dirt',
    treeDensity: 0.15, grassDensity: 2,
    color: '#a6dc63', // a soft, sunny green
  });
  ctx.worldgen.feature('flower_meadow_decor', { biomes: [FLOWER_MEADOW], run: (api: any) => decorateFlowerMeadow(api) });

  for (const [block, dye] of [['starflower', 'dye_blue'], ['bellflower', 'dye_red'], ['cupflower', 'dye_yellow'], ['laceflower', 'dye_purple']]) {
    ctx.recipes.add({ key: `${dye}_from_${block}`, out: `mineclaude:${dye}`, n: 1, in: [[ns(block), 1]], category: 'mineclaude:misc' });
  }
}
