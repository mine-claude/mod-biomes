// @ts-check
// Bosque de Copas Altas (biomes:tall_canopy): a woodland of TALL trees — straight trunks of 9 to 14 blocks under broad, high
// crowns — over a shaded floor of ferns and undergrowth. Same temperature band as the Prado Florido but on the humid side, so
// the two meet along a long edge: where the Canopy Sentinels watch from and the goblins gather at night (mod creatures).
// Everything of it is registered by ONE call, registerTallCanopy(ctx), from src/main.ts:
//   - its textures (textures/tall_canopy/*.png, painted by tall_canopy/art.ts through tools/gen-textures.ts)
//   - its blocks: canopy log, canopy leaves, shade fern, undergrowth
//   - the biome itself, and one decoration step (feature): the floor and the tall trees (tall_canopy/feature.ts)
//   - a cheap recipe: a canopy log gives planks like any log
import { ns } from '../src/names.ts';
import { decorateTallCanopy } from './feature.ts';
import { HUMIDITY_EDGE, TEMPERATE } from '../flower_meadow/index.ts';
import { nicheOf } from '../src/niches.ts';

export const TALL_CANOPY = ns('tall_canopy'); // 'biomes:tall_canopy' — what spawn rules and filters name
export const BLOCKS = Object.freeze({ log: ns('canopy_log'), leaves: ns('canopy_leaves'), fern: ns('canopy_fern'), bush: ns('undergrowth') });

const TEXTURES = ['canopy_log_side', 'canopy_log_top', 'canopy_leaves', 'canopy_fern', 'undergrowth'];

const plant = (name: string, tile: string) => ({
  name, solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
  tiles: { top: tile, side: tile, bottom: tile },
});

/** @param {any} ctx */
export function registerTallCanopy(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/tall_canopy/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);

  ctx.blocks.register('canopy_log', {
    name: 'Tronco de Copa', solid: true, hardness: 2, tool: 'axe',
    tiles: { top: tx('canopy_log_top'), side: tx('canopy_log_side'), bottom: tx('canopy_log_top') },
  });
  // like the base game's leaves: solid, see-through, quick to break, nothing drops (no leaf decay in this game)
  ctx.blocks.register('canopy_leaves', {
    name: 'Folhas de Copa', solid: true, cutout: true, transparent: true, hardness: 0.2, drop: null,
    tiles: { top: tx('canopy_leaves'), side: tx('canopy_leaves'), bottom: tx('canopy_leaves') },
  });
  ctx.blocks.register('canopy_fern', plant('Samambaia-de-sombra', tx('canopy_fern')));
  ctx.blocks.register('undergrowth', plant('Moita-de-sombra', tx('undergrowth')));

  ctx.worldgen.biome('tall_canopy', {
    name: 'Bosque de Copas Altas',
    climate: { temp: [TEMPERATE[0], TEMPERATE[1]], humidity: [HUMIDITY_EDGE, 0.4] },
    weight: 30,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('tall_canopy'),
    surface: 'mineclaude:grass', filler: 'mineclaude:dirt',
    treeDensity: 0.5, grassDensity: 0.7, // a few of the game's small trees stay as the understory
    color: '#4c8a3c', // a shaded green
  });
  ctx.worldgen.feature('tall_canopy_decor', { biomes: [TALL_CANOPY], run: (api: any) => decorateTallCanopy(api) });

  ctx.recipes.add({ key: 'planks_from_canopy_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.log, 1]], category: 'mineclaude:building_blocks' });
}
