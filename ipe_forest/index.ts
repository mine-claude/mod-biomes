// @ts-check
// Ipezal (biomes:ipe_forest): a warm, sunny forest of flowering ipê trees (an original design inspired by the Brazilian ipê):
// dark twisted trunks under round crowns made entirely of blossoms — purple, yellow or white, one colour per grove, mixed at
// the edges — and a carpet of fallen petals of the same colour under every tree. Bromeliads on the open ground, a low stump
// now and then, and petals drifting down from the crowns in the browser. Everything of it is registered by ONE call,
// registerIpeForest(ctx), from src/main.ts:
//   - its textures (textures/ipe_forest/*.png, painted by ipe_forest/art.ts through tools/gen-textures.ts)
//   - its blocks: ipê log, three blossoms, three petal carpets (a 1/16 layer), bromeliad, ipê stump, blooming core
//   - the biome itself (warm, below the desert, a little humid; few of the game's own trees; a warm grass tint)
//   - one decoration step (feature.ts): the ipê trees, the petal carpets, bromeliads, stumps
//   - the petal renderer of the blooming core (renderer.ts; it only runs in the browser)
//   - cheap recipes: an ipê log or stump gives planks; a purple or yellow blossom gives a dye of its colour
import { ns } from '../src/names.ts';
import { decorateIpeForest } from './feature.ts';
import { COLOUR_NAMES } from './grove.ts';
import { petalRenderer } from './renderer.ts';
import { nicheOf } from '../src/niches.ts';

export const IPE_FOREST = ns('ipe_forest'); // 'biomes:ipe_forest' — what spawn rules and filters name
export const BLOCKS = Object.freeze({
  log: ns('ipe_log'), stump: ns('ipe_stump'), bromeliad: ns('bromeliad'), core: ns('blooming_ipe_core'),
  blossom: COLOUR_NAMES.map((c) => ns(`ipe_blossom_${c}`)), carpet: COLOUR_NAMES.map((c) => ns(`petal_carpet_${c}`)),
});
// warm (up to just below the desert: with the ragged ±0.04 of the climate the desert, above ~0.18, never falls inside) and a
// little humid: on the humid side of the Dunas Vermelhas (which end at -0.02), sharing ground with the canopy woods by weight
export const CLIMATE = Object.freeze({ temp: [-0.03, 0.13], humidity: [-0.02, 0.3] });

const TEXTURES = ['ipe_log_side', 'ipe_log_top', ...COLOUR_NAMES.map((c) => `ipe_blossom_${c}`), ...COLOUR_NAMES.map((c) => `petal_carpet_${c}`), 'bromeliad', 'blooming_ipe_core'];
const BLOSSOM_NAMES = ['Flor de Ipê-roxo', 'Flor de Ipê-amarelo', 'Flor de Ipê-branco'];
const CARPET_NAMES = ['Pétalas de Ipê-roxo', 'Pétalas de Ipê-amarelo', 'Pétalas de Ipê-branco'];

/** @param {any} ctx */
export function registerIpeForest(ctx: any) {
  for (const t of TEXTURES) ctx.textures.png(t, `textures/ipe_forest/${t}.png`, { size: 16 });
  const tx = (t: string) => ns(t);
  const logTiles = { top: tx('ipe_log_top'), side: tx('ipe_log_side'), bottom: tx('ipe_log_top') };

  ctx.blocks.register('ipe_log', { name: 'Tronco de Ipê', solid: true, hardness: 2.4, tool: 'axe', tiles: logTiles });
  // the crowns: like leaves (solid, see-through, quick to break) but made of flowers; each drops itself (for the dye)
  COLOUR_NAMES.forEach((c, i) => ctx.blocks.register(`ipe_blossom_${c}`, {
    name: BLOSSOM_NAMES[i], solid: true, cutout: true, transparent: true, hardness: 0.2,
    tiles: { top: tx(`ipe_blossom_${c}`), side: tx(`ipe_blossom_${c}`), bottom: tx(`ipe_blossom_${c}`) },
  }));
  // the fallen petals: a thin layer 1/16 high on the ground, walk-through, gone when the ground under it goes
  COLOUR_NAMES.forEach((c, i) => ctx.blocks.register(`petal_carpet_${c}`, {
    name: CARPET_NAMES[i], solid: false, noCollide: true, cutout: true, transparent: true, hardness: 0, replaceable: true, needsFloor: true,
    tiles: { top: tx(`petal_carpet_${c}`), side: tx(`petal_carpet_${c}`), bottom: tx(`petal_carpet_${c}`) },
    geometry: { model: [[0, 0, 0, 1, 1 / 16, 1]] },
  }));
  ctx.blocks.register('bromeliad', {
    name: 'Bromélia', solid: false, noCollide: true, transparent: true, cutout: true, hardness: 0, shape: 'cross', replaceable: true, needsFloor: true,
    tiles: { top: tx('bromeliad'), side: tx('bromeliad'), bottom: tx('bromeliad') },
  });
  // a low stump: half a block of ipê, narrower than a cell
  ctx.blocks.register('ipe_stump', {
    name: 'Toco de Ipê', solid: true, hardness: 2, tool: 'axe', tiles: logTiles,
    geometry: { model: [[3 / 16, 0, 3 / 16, 13 / 16, 7 / 16, 13 / 16]] },
  });
  // hidden in most crowns: its petals drift down in the browser (renderer.ts)
  ctx.blocks.register('blooming_ipe_core', {
    name: 'Coração de Ipê Florido', solid: true, cutout: true, transparent: true, hardness: 0.3,
    tiles: { top: tx('blooming_ipe_core'), side: tx('blooming_ipe_core'), bottom: tx('blooming_ipe_core') },
  });
  ctx.render.blockEntity('blooming_ipe_core', petalRenderer);

  ctx.worldgen.biome('ipe_forest', {
    name: 'Ipezal',
    climate: { temp: [CLIMATE.temp[0], CLIMATE.temp[1]], humidity: [CLIMATE.humidity[0], CLIMATE.humidity[1]] },
    weight: 35,
    // terrain 2: where it grows in climate space (src/niches.ts, the whole climate map in one table); terrain 1 ignores it
    placement: nicheOf('ipe_forest'),
    surface: 'mineclaude:grass', filler: 'mineclaude:dirt',
    treeDensity: 0.1, grassDensity: 0.8, // the ipês are the forest: almost none of the game's own trees
    color: '#b4c650', // a warm, sun-dried green
  });
  ctx.worldgen.feature('ipe_forest_decor', { biomes: [IPE_FOREST], run: (api: any) => decorateIpeForest(api) });

  ctx.recipes.add({ key: 'planks_from_ipe_log', out: 'mineclaude:planks', n: 4, in: [[BLOCKS.log, 1]], category: 'mineclaude:building_blocks' });
  ctx.recipes.add({ key: 'planks_from_ipe_stump', out: 'mineclaude:planks', n: 2, in: [[BLOCKS.stump, 1]], category: 'mineclaude:building_blocks' });
  // the game has no white dye: the white blossom stays decorative
  ctx.recipes.add({ key: 'dye_purple_from_ipe_blossom', out: 'mineclaude:dye_purple', n: 1, in: [[BLOCKS.blossom[0], 1]], category: 'mineclaude:misc' });
  ctx.recipes.add({ key: 'dye_yellow_from_ipe_blossom', out: 'mineclaude:dye_yellow', n: 1, in: [[BLOCKS.blossom[1], 1]], category: 'mineclaude:misc' });
}
